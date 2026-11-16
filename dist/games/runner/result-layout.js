(function(root){
 function fitResultLayout(width,height,textLength=1){
  const aspect=1654/927,w=Math.min(width,height*aspect),h=w/aspect;
  return {width:w,height:h,distanceFont:Math.min(w*.08,w*.25/(Math.max(1,textLength)*.7))};
 }
 root.fitRunnerResultLayout=fitResultLayout;
 if(typeof module!=='undefined')module.exports={fitResultLayout};
})(globalThis);
