"""Download every inventoried Storage object; fail closed on missing/private files."""
import hashlib
import json
import os
from pathlib import Path
import subprocess
import urllib.parse
import urllib.request

QUERY = """select coalesce(json_agg(x order by bucket_id,name),'[]'::json)::text from
(select o.bucket_id,o.name,o.metadata,o.updated_at,b.public
 from storage.objects o join storage.buckets b on b.id=o.bucket_id) x;"""

def inventory():
    env = dict(os.environ, PGDATABASE=os.environ['SUPABASE_DB_URL'])
    result = subprocess.run(['psql', '-X', '-A', '-t', '-v', 'ON_ERROR_STOP=1', '-c', QUERY],
                            env=env, capture_output=True, text=True)
    if result.returncode:
        raise RuntimeError('Impossibile leggere inventario Storage; dettagli connessione omessi.')
    return json.loads(result.stdout)

def download(objects, folder, base_url, key=''):
    folder.mkdir(parents=True, exist_ok=True)
    manifest=[]
    for obj in objects:
        if not obj['public'] and not key:
            raise RuntimeError('Storage privato presente: configurare il secret SUPABASE_SERVICE_ROLE_KEY.')
        route='authenticated' if key else 'public'
        path=urllib.parse.quote(obj['bucket_id'],safe='')+'/'+urllib.parse.quote(obj['name'],safe='/')
        headers={'Authorization':'Bearer '+key, 'apikey':key} if key else {}
        request=urllib.request.Request(base_url+'/storage/v1/object/'+route+'/'+path,headers=headers)
        # Flat local filenames avoid traversal through remote object names.
        local=hashlib.sha256((obj['bucket_id']+'\0'+obj['name']).encode()).hexdigest()+'.bin'
        digest=hashlib.sha256(); size=0
        with urllib.request.urlopen(request,timeout=90) as response, (folder/local).open('wb') as out:
            while chunk:=response.read(1024*1024):
                digest.update(chunk);out.write(chunk);size+=len(chunk)
        expected=(obj.get('metadata') or {}).get('size')
        if expected is not None and size!=int(expected):
            raise RuntimeError('Dimensione Storage cambiata durante il backup; riprovare.')
        manifest.append(dict(obj,file=local,sha256=digest.hexdigest(),bytes=size))
    (folder/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2))
    return manifest

if __name__=='__main__':
    os.umask(0o077)
    before=inventory()
    download(before,Path('temp_backup/storage'),os.environ['SUPABASE_URL'].rstrip('/'),os.getenv('SUPABASE_SERVICE_ROLE_KEY',''))
    if before!=inventory():
        raise RuntimeError('Inventario Storage cambiato durante il backup; riprovare.')
    print(f'Storage: {len(before)} file salvati e verificati.')
