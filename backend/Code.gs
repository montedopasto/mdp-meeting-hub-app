/** MDP Meeting Hub — Google Sheets API. No meeting data or passwords in the public source. */
const MDP_SHEET_ID='1LRdtaoF_r3H-SKGlqz-S4VeJe586oySd9jXTX9uauak';
function book_(){return SpreadsheetApp.openById(MDP_SHEET_ID);}
function json_(v){return ContentService.createTextOutput(JSON.stringify(v)).setMimeType(ContentService.MimeType.JSON);}
function doGet(){return json_({ok:true,data:{service:'MDP Meeting Hub',version:'2.0'}});}
function doPost(e){let lock;try{
 const action=String(e.parameter.action||''),p=JSON.parse(e.parameter.payload||'{}'),token=String(e.parameter.token||'');
 if(action==='login')return json_({ok:true,data:login_(p.password)});
 if(!token||!CacheService.getScriptCache().get('session:'+token))return json_({ok:false,code:'AUTH',error:'A sessão expirou. Volte a entrar.'});
 if(action==='logout'){CacheService.getScriptCache().remove('session:'+token);return json_({ok:true,data:{}});}
 lock=LockService.getScriptLock();lock.waitLock(20000);
 const current=readState_();
 if(action==='read')return json_({ok:true,data:current});
 if(action!=='mutate')throw Error('Operação desconhecida.');
 if(Number(p.revision)!==current.revision)throw Error('Os dados foram alterados noutra janela. Atualize os dados antes de guardar.');
 const event={operation:p.operation,payload:p.payload,at:new Date().toISOString(),id:Utilities.getUuid()};
 const next=applyEvent_(current.data,event);
 const row=[current.revision+1,event.operation,JSON.stringify(event.payload),event.at,event.id];
 if(row[2].length>45000)throw Error('O texto é demasiado longo. Divida a atualização.');
 book_().getSheetByName('Eventos').appendRow(row);SpreadsheetApp.flush();
 return json_({ok:true,data:{data:next,revision:current.revision+1}});
 }catch(err){return json_({ok:false,error:err.message||String(err)});}finally{if(lock&&lock.hasLock())lock.releaseLock();}}
function digest_(text){return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,text,Utilities.Charset.UTF_8).map(b=>('0'+((b+256)%256).toString(16)).slice(-2)).join('');}
function configurarPalavraPasse(){
 const ui=SpreadsheetApp.getUi(),answer=ui.prompt('MDP Meeting Hub','Defina uma palavra-passe de pelo menos 12 caracteres. Partilhe-a apenas com o Comité.',ui.ButtonSet.OK_CANCEL);
 if(answer.getSelectedButton()!==ui.Button.OK)return;
 const password=answer.getResponseText();if(password.length<12)throw Error('Use pelo menos 12 caracteres.');
 const salt=Utilities.getUuid();PropertiesService.getScriptProperties().setProperties({PASSWORD_SALT:salt,PASSWORD_HASH:digest_(salt+password)});ui.alert('Palavra-passe configurada. Pode implementar a aplicação web.');
}
function login_(password){
 const prop=PropertiesService.getScriptProperties(),salt=prop.getProperty('PASSWORD_SALT'),hash=prop.getProperty('PASSWORD_HASH');if(!salt||!hash)throw Error('O administrador deve executar configurarPalavraPasse no Apps Script.');
 const lock=LockService.getScriptLock();lock.waitLock(10000);try{
 const cache=CacheService.getScriptCache(),count=Number(cache.get('login-failures')||0);
 if(count>=10)throw Error('Demasiadas tentativas. Aguarde um minuto antes de tentar novamente.');
 if(digest_(salt+String(password||''))!==hash){cache.put('login-failures',String(count+1),60);throw Error('Palavra-passe incorreta.');}
 cache.remove('login-failures');const token=Utilities.getUuid()+Utilities.getUuid();cache.put('session:'+token,'1',21600);return {token};
 }finally{lock.releaseLock();}}
function readState_(){
 const ss=book_(),base=ss.getSheetByName('Base'),events=ss.getSheetByName('Eventos');if(!base||!events)throw Error('Faltam as folhas Base e Eventos na Google Sheet.');
 const data={actions:[],meetings:[],source:'Ata de Reuniao_07_10_2026.xlsx'};
 const rows=base.getDataRange().getValues();rows.slice(1).forEach(r=>{if(!r[0])return;const value=JSON.parse(r[7]);if(r[1]==='Assunto')data.actions.push(value);else if(r[1]==='Reunião')data.meetings.push(value);});
 if(!data.meetings.length)throw Error('A importação inicial não está disponível.');
 const history=events.getDataRange().getValues();let state=data,revision=0;history.slice(1).forEach(r=>{if(!r[0])return;if(Number(r[0])!==revision+1)throw Error('O histórico tem uma revisão em falta. Contacte o administrador.');state=applyEvent_(state,{operation:r[1],payload:JSON.parse(r[2]),at:String(r[3]),id:String(r[4])});revision=Number(r[0]);});
 return {data:state,revision};
}
function applyEvent_(input,event){
 const data=JSON.parse(JSON.stringify(input)),p=event.payload||{},m=data.meetings.find(x=>x.id===p.meetingId),operation=event.operation;
 const open=()=>{if(!m||m.status!=='Aberta')throw Error('Escolha uma reunião aberta.');};
 const iso=x=>/^\d{4}-\d{2}-\d{2}$/.test(x)&&!isNaN(Date.parse(x+'T12:00:00Z'))&&new Date(x+'T12:00:00Z').toISOString().slice(0,10)===x;
 if(operation==='action'){
 open();if(!p.title||!String(p.title).trim()||!p.owner||!String(p.owner).trim()||!p.area||!String(p.area).trim()||!p.text||!String(p.text).trim())throw Error('Preencha área, assunto, responsável e ponto de situação.');
 if(!['A iniciar','Pendente','Em curso','Finalizado'].includes(p.status))throw Error('Estado inválido.');if(p.due&&!iso(p.due))throw Error('Prazo inválido.');
 let a=data.actions.find(x=>x.id===p.id);if(p.id&&!a)throw Error('Assunto desconhecido.');if(a&&!m.actionIds.includes(a.id))throw Error('O assunto não pertence a esta reunião.');
 if(!a){a={id:event.id,updates:[]};data.actions.push(a);m.actionIds.push(a.id);}
 Object.assign(a,{area:String(p.area).trim(),title:String(p.title).trim(),owner:String(p.owner).trim(),status:p.status,due:p.due||''});
 a.updates.push({at:event.at,meetingId:m.id,text:String(p.text).trim(),status:a.status,owner:a.owner,due:a.due,kind:'Atualização'});
 }else if(operation==='meeting'){open();if(!p.location||!String(p.location).trim())throw Error('Indique o local.');m.location=String(p.location).trim();m.participants=String(p.participants||'');
 }else if(operation==='close'){open();m.snapshots=m.actionIds.map(id=>JSON.parse(JSON.stringify(data.actions.find(a=>a.id===id))));m.status='Encerrada';m.closedAt=event.at;
 }else if(operation==='next'){
 if(data.meetings.some(x=>x.status==='Aberta'))throw Error('Encerre a reunião aberta antes de preparar a seguinte.');const last=data.meetings[data.meetings.length-1];
 if(!iso(p.date)||p.date<=last.date)throw Error('Escolha uma data posterior à última reunião.');
 data.meetings.push({id:event.id,date:p.date,location:p.location||last.location,participants:p.participants||last.participants,status:'Aberta',actionIds:data.actions.filter(a=>a.status!=='Finalizado').map(a=>a.id),snapshots:null});
 }else throw Error('Operação desconhecida.');return data;
}
