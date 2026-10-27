import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
let source=readFileSync(new URL('../supabase/functions/manage-civic/index.ts',import.meta.url),'utf8').replace(/^import .*;\n/,'');
const {createHandler}=await import('data:text/javascript;base64,'+Buffer.from(stripTypeScriptTypes(source)).toString('base64'));
async function run(opts={}) {
 const calls=[];
 const target={id:'target',email:'civic@example.test',app_metadata:{role:opts.targetRole||'civic_staff'}};
 const db={auth:{getUser:async()=>({data:{user:opts.noUser?null:{id:'caller',user_metadata:{role:'admin'}}}})},rpc:async name=>({data:opts.admin!==false&&name==='lc_portal_is_admin'})};
 const admin={from:table=>({
  select:()=>{
   if(table==='lc_admin_assignments')return Promise.resolve({data:opts.protected?[{user_id:'target'}]:[],error:opts.assignmentError});
   return {eq:()=>({maybeSingle:async()=>({data:opts.noMember?null:{user_id:'target'}})}),order:()=>({limit:async()=>({data:[]})})};
  },
  insert:async row=>{calls.push(['member',row]);return {error:opts.memberError};},
  update:row=>({eq:async()=>{calls.push(['update',row]);return {};}})
 }),auth:{admin:{
  createUser:async row=>{calls.push(['create',row]);return {data:{user:{id:'new'}}};},
  deleteUser:async id=>{calls.push(['rollback',id]);return {};},
  getUserById:async()=>({data:{user:target}}),
  updateUserById:async(id,row)=>{calls.push(['password',id,row]);return {};}
 }}};
 const handler=createHandler((url,key)=>key==='service'?admin:db,{url:'test',anon:'anon',service:'service'});
 const body={action:'create',displayName:'Civic Test',email:'civic@example.test',password:'example-password-123',userId:'target',active:false,...opts.body};
 const response=await handler(new Request('https://test.invalid',{method:'POST',headers:opts.noHeader?{}:{Authorization:'Bearer test'},body:JSON.stringify(body)}));
 return {status:response.status,body:await response.json(),calls};
}
test('civic: anonymous and ordinary users cannot create accounts, even with admin user_metadata',async()=>{
 for(const opts of [{noHeader:true},{noUser:true},{admin:false}]){const r=await run(opts);assert.ok([401,403].includes(r.status));assert.equal(r.calls.length,0);}
});
test('civic: creation writes only civic membership and fixed non-admin role',async()=>{
 const r=await run({body:{role:'admin'}});assert.equal(r.status,200);assert.equal(r.calls[0][1].app_metadata.role,'civic_staff');assert.equal(r.calls[1][1].active,true);
});
test('civic: invalid requests and authorization lookup errors do not create accounts',async()=>{
 for(const body of [{displayName:'a'},{email:'bad'},{password:'short'},{action:'delete'}]){const r=await run({body});assert.equal(r.status,400);assert.equal(r.calls.length,0);}
 const r=await run({assignmentError:{message:'offline'}});assert.equal(r.status,500);assert.equal(r.calls.length,0);
});
test('civic: failed membership rolls back new auth account',async()=>{
 const r=await run({memberError:{message:'db error'}});assert.equal(r.status,500);assert.deepEqual(r.calls.map(c=>c[0]),['create','member','rollback']);
});
test('civic: password and suspension cannot target admins, other roles, protected or nonmembers',async()=>{
 for(const action of ['set_password','toggle_active'])for(const opts of [{targetRole:'admin'},{targetRole:'medic'},{protected:true},{noMember:true},{admin:false}]){
  const r=await run({...opts,body:{action}});assert.equal(r.status,403);assert.equal(r.calls.length,0);
 }
});
test('civic: authorized password and suspension operations work and validate state',async()=>{
 for(const action of ['set_password','toggle_active'])assert.equal((await run({body:{action}})).status,200);
 assert.equal((await run({body:{action:'toggle_active',active:'false'}})).status,400);
 assert.equal((await run({body:{action:'set_password',password:'short'}})).status,400);
});
