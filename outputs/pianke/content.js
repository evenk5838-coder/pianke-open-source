/* Original short-form guidance. Product pacing is not a clinical treatment dose. */
(() => {
  'use strict';
  const body = [
    ['鼻尖与气息','如果舒服，可以闭上眼睛。留意鼻尖，感觉空气轻轻经过。呼吸保持自然。',18],
    ['眼睛','留意眼睛周围。眼皮自然合着，不需要再寻找什么。',19],
    ['额头','留意额头。眉毛自然放着，不必刻意做表情。',15],
    ['脸颊','感觉两侧脸颊。让面部保持舒服的状态。',22],
    ['嘴唇与下颌','留意嘴唇和下颌。牙齿不必咬紧。',26],
    ['耳朵','听见周围的声音就好。不需要分辨，也不必排除。',24],
    ['颈部','感觉颈部此刻的状态。头自然地安放着。',34],
    ['肩膀','把注意放到肩膀。可以让肩膀稍稍松下来。',39],
    ['手臂','留意上臂和前臂。让它们被桌面、扶手或腿部承托。',48],
    ['双手','感觉手掌和指尖。是暖的、凉的，还是没有明显感觉，都可以。',57],
    ['胸口','留意胸口随着呼吸轻轻起伏。不需要把气吸得更深。',49],
    ['腹部','把注意放到腹部，感受呼吸带来的一点点变化。',60],
    ['背部','感觉背部与椅背的接触。让椅子承托一部分重量。',61],
    ['腰与髋部','留意腰和髋部。坐垫正在承托着身体。',69],
    ['大腿','感觉大腿和坐面的接触。双腿自然放着。',76],
    ['小腿','让注意慢慢来到小腿，不需要收紧或拉伸。',85],
    ['双脚','感觉脚底和地面的接触。脚趾可以自然放松。',92],
    ['整个身体','把注意放回整个身体。安静地停留一会儿，保持舒服的呼吸。',50]
  ].map(([title,text,y])=>Object.freeze({title,text,y}));
  const scenes = [
    {id:'water',name:'水波',hint:'柔和起伏'},
    {id:'rain',name:'细雨',hint:'均匀细密'},
    {id:'wind',name:'微风',hint:'缓缓经过'},
    {id:'leaves',name:'树叶',hint:'轻轻沙沙'},
    {id:'fire',name:'篝火',hint:'低声噼啪'},
    {id:'night',name:'夜色',hint:'稀疏虫鸣'}
  ];
  const focus = [
    ['让目光轻轻停留','看看圆心与周围的柔光。正常眨眼，不必盯紧。'],
    ['此刻，注意力在哪里？','如果刚才走神了，现在轻轻回到眼前的圆心。'],
    ['再留意一次明暗','圆心与周围的柔光，都可以成为观察的对象。'],
    ['走神，也可以回来','不需要责备自己。重新看见眼前，就已经开始了。']
  ];
  const breathIntro=Object.freeze(['用鼻子，轻轻吸气。','用嘴巴，缓缓呼气。','鼻子吸气。','嘴巴呼气。接下来，高音吸，低音呼。']);
  window.PiankeContent = Object.freeze({body,scenes,focus,breathIntro,
    bodyAt(elapsed,total){return body[Math.min(body.length-1,Math.floor(Math.max(0,elapsed)/Math.max(1,total)*body.length))];},
    focusAt(elapsed){const index=Math.floor(Math.max(0,elapsed)/35);return {key:index,title:focus[index%focus.length][0],text:focus[index%focus.length][1]};}
  });
})();
