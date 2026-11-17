'use strict';
const demos={
  home:{src:'media/home.jpg',alt:'片刻首页的三类入口与练习卡片',caption:'点开菜单栏面板，选择放松、专注或眼睛休息。'},
  breathing:{src:'media/breathing.jpg',alt:'片刻呼吸引导的真实界面，柔和波纹与吸呼提示',caption:'鼻吸 4 秒、口呼 6 秒。水波或烟圈跟随同一呼吸时钟变化。'},
  scenes:{src:'media/scene-picker.jpg',alt:'自然声景设置页，七类声音与当前两张可选图片',caption:'先选声音，再选风景。每一类分别记住上次的画面选择。'},
  immersion:{src:'media/scene-immersion.jpg',alt:'云端雨夜的完整静态沉浸画面，控制条隐藏',caption:'控件默认隐藏；点击画面后，可调整音量、暂停、结束或换图。'}
};
const tabs=[...document.querySelectorAll('[data-demo]')];
function selectDemo(tab,focus=false){
  const item=demos[tab.dataset.demo];
  for(const button of tabs){const selected=button===tab;button.setAttribute('aria-selected',String(selected));button.tabIndex=selected?0:-1;}
  const image=document.getElementById('demo-image');image.src=item.src;image.alt=item.alt;
  document.getElementById('demo-caption').textContent=item.caption;
  document.getElementById('demo-panel').setAttribute('aria-labelledby',tab.id);
  if(focus)tab.focus();
}
tabs.forEach((tab,index)=>{
  tab.addEventListener('click',()=>selectDemo(tab));
  tab.addEventListener('keydown',event=>{
    let next;
    if(event.key==='ArrowRight')next=(index+1)%tabs.length;
    if(event.key==='ArrowLeft')next=(index+tabs.length-1)%tabs.length;
    if(event.key==='Home')next=0;
    if(event.key==='End')next=tabs.length-1;
    if(next!==undefined){event.preventDefault();selectDemo(tabs[next],true);}
  });
});
document.getElementById('copy-command').addEventListener('click',async()=>{
  const status=document.getElementById('copy-status');
  try{await navigator.clipboard.writeText(document.getElementById('install-command').textContent);status.textContent='命令已复制，可以粘贴到终端运行。';}
  catch{status.textContent='暂时无法自动复制，请选中上面的命令手动复制。';}
});
