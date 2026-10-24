import {readFileSync} from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
import assert from 'node:assert/strict';
let source=readFileSync(new URL('../supabase/functions/manage-sheriffs/index.ts',import.meta.url),'utf8');
source=source.replace(/^import .*;\n/,'const withSupabase = (_, fn) => fn;\n');
const {default:handler}=await import('data:text/javascript;base64,'+Buffer.from(stripTypeScriptTypes(source)).toString('base64'));
async function run({role='admin',targetRole='sheriff',protectedTarget=false,rpc=true,assignmentError=null,action='set_password'}={}) {
 let writes=0;
 const target={id:'target',app_metadata:{role:targetRole},user_metadata:{}};
 const ctx={supabase:{auth:{getUser:async()=>({data:{user:{id:'caller',app_metadata:{role}}}})},rpc:async()=>({data:rpc})},supabaseAdmin:{from:()=>({select:async()=>({data:protectedTarget?[{user_id:'target'}]:[],error:assignmentError})}),auth:{admin:{getUserById:async()=>({data:{user:target}}),updateUserById:async()=>{writes++;return {data:{user:target}}},listUsers:async()=>({data:{users:[target,{id:'admin',app_metadata:{role:'admin'}}]}})}}}};
 const res=await handler.fetch(new Request('https://example.test',{method:'POST',body:JSON.stringify({action,userId:'target',password:'test-password-only',displayName:'Test'})}),ctx);
 return {status:res.status,writes,body:await res.json()};
}
for(const action of ['set_password','update_name']) {
 for(const opts of [{targetRole:'admin'},{protectedTarget:true},{role:'sheriff'},{rpc:false},{targetRole:'medic'}]) {
  const r=await run({...opts,action});assert.equal(r.status,403);assert.equal(r.writes,0);
 }
 const r=await run({action});assert.equal(r.status,200);assert.equal(r.writes,1);
}
assert.equal((await run({assignmentError:new Error('offline')})).writes,0);
assert.equal((await run({action:'list'})).body.users.length,1);
assert.equal((await run({action:'list',protectedTarget:true})).body.users.length,0);
console.log('15 verifiche autorizzazione superate; nessun account reale modificato.');
