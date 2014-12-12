var source_lines_per_unit_charge = 6;
var k = 10;

// A list of random things values from zero to twopi, as trial seeds for directions
var myRandom = [];
for(var r=0;r<7;r++) myRandom.push(Math.PI*2*r/7.);
for(var r=1;r<15;r++) myRandom.push(Math.PI*2*r/15.);
for(var r=2;r<1000;r++) myRandom.push(Math.random()*Math.PI*2);




$(function(){
  applet = new Applet($('div#sim'));
  $('#downloadlink').bind('click' ,function(ev) { 
    
    var dt = applet.canvas .toDataURL('image/png');
    this.href = dt;
    
    // return DoPrint($('#everything'),true);  
  });
});


function Applet(element, options)
{
  if(!element) { 
    console.log("Pad: NULL element provided."); return; 
  }
  if($(element).length<1) { 
    console.log("Pad: Zero-length jquery selector provided."); return;
  }
  this.element = $(element).get(0); 
  
  this.bg_color = "255,255,255";
  this.origin_x = 0.0;
  this.origin_y = 0.0;
  this.width_x  = 10.0;
  this.dragging = false;
  
  // Merge in the options.
  $.extend(true,this,options);

  // Merge in options from element
  var element_settings = $(element).attr('settings');
  var element_settings_obj={};
  // if(element_settings) {
  //   eval( "var element_settings_obj = { " + element_settings + '};');; // override from 'settings' attribute of html object.
  //   console.log(element_settings, element_settings_obj);
  //   $.extend(true,this,element_settings_obj); // Change default settings by provided overrides.
  //
  // }
  // Look for an existing canvas, and build one if it's not there.
  if($('canvas',this.element).length<1) {
    this.canvas = document.createElement("canvas");
    this.element.appendChild(this.canvas);
  } else {
    this.canvas = $('canvas',this.element).get(0);    
  }
  
  if(!element) { 
    console.log("Pad: NULL element provided."); return; 
  }
  if($(element).length<1) { 
    console.log("Pad: Zero-length jquery selector provided."); return;
  }
  this.element = $(element).get(0); 



  // Build the drawing context.
  this.ctx = this.canvas.getContext('2d');
  // if(initCanvas) this.ctx = initCanvas(this.canvas).getContext('2d');
  if(!this.ctx) console.log("Problem getting context!");
  if( !$(this.element).is(":hidden") ) {
    width = $(this.element).width();
    height = $(this.element).height(); 
  }
  this.canvas.width = this.width = width;
  this.canvas.height = this.height = height;

  

  // Data.
  this.charges = [];
  
  // see if there's an override in the URL
  var urlParams;
  var match,
      pl     = /\+/g,  // Regex for replacing addition symbol with a space
      search = /([^&=]+)=?([^&]*)/g,
      decode = function (s) { return decodeURIComponent(s.replace(pl, " ")); },
      query  = window.location.search.substring(1);

  urlParams = {};
  while (match = search.exec(query))
         urlParams[decode(match[1])] = decode(match[2]);
  
  for( p in urlParams ) {
    if(p.match(/^q/)) {
      var list = urlParams[p].split(',');
      this.charges.push({q:parseFloat(list[0]),
                         x:parseFloat(list[1]),
                         y:parseFloat(list[2]),
                         r:Math.abs(parseFloat(list[0]))*0.12});
    }
  }
  
  if(this.charges.length==0) this.charges = [
                              { q : 1,  x : -1,  y: 1 , r:0.12},
                              { q : -1, x : 1,   y:-0 , r:0.12 },
                              { q : -2, x : 1.001,   y:-1 , r:0.24 },
                              ];
  
  
  this.FindFieldLines();
  this.Draw();

  var self = this;
  $(window).bind('resize',function(ev) { return self.Resize(ev); });
  
  $(window).bind('mousemove',function(ev) { return self.DoMouse(ev); });
  $(this.element).bind('mousedown',function(ev) { return self.DoMouse(ev); });
  $(window).bind('mouseup',function(ev) { return self.DoMouse(ev); });
  $(this.element).bind('mouseout' ,function(ev) { return self.DoMouse(ev); });  
  $('.addcharge').bind('mousedown' ,function(ev) { return self.AddCharge(ev); });  

  $(this.element).bind('touchstart',function(ev) { return self.DoMouse(ev); });
  $(window).bind('touchmove',function(ev) { return self.DoMouse(ev); });
  $(window).bind('touchend',function(ev) { return self.DoMouse(ev); });
  $('.addcharge').bind('touchstart' ,function(ev) { return self.AddCharge(ev); });  

}

Applet.prototype.Resize = function()
{
  console.log("Applet::Resize()",this);
  var width = $(this.element).width();
  var height = $(this.element).height(); 
  this.canvas.width = this.width = width;
  this.canvas.height = this.height = height;
  this.Draw();
}


Applet.prototype.Clear = function()
{
  //console.log("Pad.Clear()");
  if (!this.ctx) return;
  this.ctx.fillStyle = "rgb("+this.bg_color+")";
  this.ctx.fillRect(0,0,this.canvas.width,this.canvas.height);
}

Applet.prototype.Field = function(x,y)
{
  var Ex = 0;
  var Ey = 0;
  var U  = 0;
  var dUdx = 0;
  for(var i=0 ;i<this.charges.length; i++) {
    var c = this.charges[i];
    var dx = x-c.x;
    var dy = y-c.y;
    var r2 = dx*dx+dy*dy;
    var r = Math.sqrt(r2);
    var E = c.q/r2;
    Ex += dx/r*E;
    Ey += dy/r*E;
    U += c.q/r;
  }
  var E2 = Ex*Ex + Ey*Ey;
  var E = Math.sqrt(E2);
  var ret = { U: U,  
              E: E, 
              x: Ex/E,   y: Ey/E
              };
  // console.log("Field at "+x+","+y,ret);
  return ret;
}




Applet.prototype.FindCollision = function(x,y)
{
  for(var i=0 ;i<this.charges.length; i++) {
    var c = this.charges[i];
    var dx = x-c.x;
    var dy = y-c.y;
    var r2 = dx*dx+dy*dy;
    var cr = c.r-0.0001;
    if(r2 < (cr*cr)) {
      // console.log("collision",dx,dy,r2,cr*cr);
      return c;
    }
  }
  return null;
}


function chargesort(a,b)
{
  var cmp = a.q - b.q;
  return cmp;
}

Applet.prototype.FindFieldLines = function()
{
  // configuration:
  var step = 0.05;
  var start_step = 0.001;
  var max_steps = 1000;
  

  this.fieldLines = [];

  var total_charge = 0;
  for(var i=0 ;i<this.charges.length; i++) {
    var charge = this.charges[i];
    var npoints = Math.round(Math.abs(source_lines_per_unit_charge*charge.q));
    // Set all points to 'unused'.
    charge.nodesNeeded =[];
    // Original algorithm: Space 'needed' nodes around evenly.
    for(var j = 0; j<npoints; j++) {
      charge.nodesNeeded.push(2*j/npoints*Math.PI);
    }

    // // Algorithm 2: Space 'needed' nodes around accoring to the
    // // LOCAL field, as adjusted by other local charges!
    // var nGrid = 72;
    // var biggestField = 0;
    // var biggestFieldJ = 0;
    // var totField = 0;
    // var grid = [];
    // for(var j=0;j<nGrid;j++) {
    //   var theta = 2*Math.PI*j/nGrid;
    //   var x = charge.x+charge.r*Math.cos(theta);
    //   var y = charge.y+charge.r*Math.sin(theta);
    //   var E = this.Field(x,y);
    //   // console.log(x,y,E,charge);
    //   if(Math.abs(E.E)>biggestField) { biggestField = Math.abs(E.E); biggestFieldJ=j;}
    //   totField += Math.abs(E.E);
    //   grid.push(E.E);
    // }
    // // Now, evenly space them around in integrated field units.
    // var spacing = totField/npoints;
    // charge.nodesNeeded.push(2*Math.PI*biggestFieldJ/nGrid);
    //
    // var sum = 0;
    // for(var j=1;j<nGrid;j++) {
    //   var jj = (j+biggestFieldJ)%nGrid;
    //   sum += grid[jj];
    //   if(sum>spacing) {charge.nodesNeeded.push(2*Math.PI*jj/nGrid); sum -= spacing;}
    // }
    // var spacings = [];
    // for(var j=1;j<charge.nodesNeeded.length;j++) {
    //   spacings.push((charge.nodesNeeded[j]-charge.nodesNeeded[j-1])/2/Math.PI);
    // }
    // // console.log('nodes',charge.nodesNeeded);
    // // console.log('spacings',spacings);
    // if(charge.nodesNeeded.length != npoints) console.log("Got wrong number of needed points. Wanted ",npoints," got ",charge.nodesNeeded.length);

    // Algorithm 3: track from the very center, using epsilon push away from charge center.
    // for(var j = 0; j<npoints; j++) {
    //   var theta = 2*j/npoints*Math.PI;
    //   var dir = 1;
    //   if(charge.q<0) dir = -1;
    //   var x = charge.x + start_step*Math.cos(theta);
    //   var y = charge.y + start_step*Math.sin(theta);
    //   var deltax = 0;
    //   var deltay = 0;
    //   var d2 = 0;
    //   var nstart = 0;
    //   do {
    //     var E = this.Field(x,y);
    //     var dx = E.x * step/10;
    //     var dy = E.y * step/10;
    //     x += dx*dir;
    //     y += dy*dir;
    //     deltax = x-charge.x;
    //     deltay = y-charge.y;
    //     d2 = deltax*deltax + deltay*deltay;
    //     nstart++;
    //   } while ( d2 < charge.r*charge.r );
    //
    //   var angle = Math.atan2(deltay,deltax);
    //
    //   charge.nodesNeeded.push(angle);
    //   console.log("need node:",deltay,deltax,angle,nstart);
    //  }
    //
    
    total_charge += charge.q;
  }

  // rank them. Use minority charge carriers first.
  this.charges.sort(chargesort);
  if(total_charge<0) this.charges.reverse();

  // Now loop through again, finding unused nodes and tracing field lines from those
  // nodes until they either hit another charge or they require too many computational cycles.
  
  for(var i=0 ;i<this.charges.length; i++) {
    var random_seed = 0;
    var charge = this.charges[i];    
    // console.log("Find field lines for charge ",i," with charge ",charge.q);
    this.ctx.fillStyle = 'blue';
    if(charge.q >0) this.ctx.fillStyle = 'red';
    // console.log("Doing charge",i,"with q=",charge.q,"which needs ",charge.nodesNeeded.length," nodes");
    for(var j=0; j<charge.nodesNeeded.length; j++) {
      var r = charge.r;
      // Boost in initial direction by radius.
      start_angle = charge.nodesNeeded[j];
      var fieldline = { startCharge: charge };

      var nodeFinished = false;
      var nodeTries =0;
      while(!nodeFinished) {
        nodeTries++;
        if(nodeTries>1) {
          start_angle = myRandom[nodeTries];
        }
        // console.log("Try: ",nodeTries,"Trying angle:",start_angle*180/Math.PI,nodeTries);
        var x = charge.x + charge.r* Math.cos(start_angle);
        var y = charge.y + charge.r* Math.sin(start_angle);
        //console.log("Start xy",x,y);
        var dir = 1;
        if(charge.q<0) dir = -1;
        fieldline.start_angle = start_angle;
        fieldline.start_x = x;
        fieldline.start_y = y;
        fieldline.dir     = dir;
        fieldline.points  = [{x:x,y:y}];

        var traceFinished = false;
        var nstep = 0;
        while(!traceFinished) {
          nstep++;
          var E = this.Field(x,y);
          var dx = E.x * step;
          var dy = E.y * step;
          x += dx*dir;
          y += dy*dir;
          fieldline.points.push({x:x,y:y});
        
          var collide = this.FindCollision(x,y);
          if(collide && (charge.q*collide.q < 0) && nstep>1) {
            traceFinished = true;
            // Find the best possible node for this line.
            if(collide.nodesNeeded.length == 0) {
              // console.log("Line failed - hit q=",collide.q,"which has no nodes left.");
              nodeFinished=false;
            } else {
              // console.warn("collided with charge that has ",collide.nodesNeeded.length,"left ")
              nodeFinished = true;
              dx = x-collide.x;
              dy = y-collide.y;
              var angle = Math.atan2(dy,dx);
              var best = 0;
              var bestdiff = 9e9;
              for(var k=0; k<collide.nodesNeeded.length;k++){
                  var diff = Math.abs( (collide.nodesNeeded[k] - angle)%(2*Math.PI) );
                  if(diff<bestdiff) {bestdiff = diff; best = k};
                }
              fieldline.endCharge = collide;
              fieldline.endAngle     = angle;
              fieldline.endNodeAngle = collide.nodesNeeded[best];
              fieldline.nstep = nstep;
              // console.log("Line succeeded - hit q=",collide.q);

              collide.nodesNeeded.splice(best,1);
            }
          }
                  
          if(nstep>max_steps){
            fieldline.endCharge = null;
            fieldline.endAngle     = null;
            fieldline.endNodeAngle = null;
            traceFinished = true;
            fieldline.nstep = nstep;
            nodeFinished = true;       
            console.log("Line succeeded - no hit");
            
          }  // if nstep 
        } // traceFinished        
      } // nodeFinished
      if(nodeTries>1) console.log("nodetries: ", nodeTries);
      this.fieldLines.push(fieldline);      
    } // nodes on this charge.
    charge.nodesNeeded = []; // We've done them all now.
  }
  
}

Applet.prototype.TotalEnergy = function()
{
  var tot = 0;
  for(var i=1 ;i<this.charges.length; i++) {
    for(var j=0 ;j<i; j++) {
    
      // compute potential at this point for all other charges.
      var ci = this.charges[i];
      var cj = this.charges[j];

      var dx = ci.x-cj.x;
      var dy = ci.y-cj.y;
      var r2 = dx*dx+dy*dy;
      var r = Math.sqrt(r2);
      tot += ci.q*cj.q/r;
    }
  }
  return tot;
}

Applet.prototype.Draw = function()
{
  this.Clear();
  this.ctx.save();
  
  this.canvas_translate = { x: this.canvas.width/2, y: this.canvas.height/2};
  this.canvas_scale     = { x: this.canvas.width/this.width_x, y: -this.canvas.width/this.width_x};
  
  this.ctx.translate(this.canvas_translate.x,this.canvas_translate.y);
  this.ctx.scale(this.canvas_scale.x,this.canvas_scale.y);
  var xmin = -this.width_x/2;
  var xmax =  this.width_x/2;
  var ymin = -this.width_x/2 * this.canvas.height/this.canvas.width;
  var ymax =  this.width_x/2 * this.canvas.height/this.canvas.width;
  
  this.ctx.strokeStyle = 'black';
  this.ctx.lineWidth = 0.01;
  this.ctx.beginPath();
  this.ctx.moveTo(xmin,ymin);
  this.ctx.lineTo(xmax,ymin);
  this.ctx.lineTo(xmax,ymax);
  this.ctx.lineTo(xmin,ymax);
  this.ctx.lineTo(xmin,ymin);
  this.ctx.stroke();
  this.ctx.beginPath();
  
  var urlparams = "";
  for(var i = 0; i< this.charges.length; i++) {
    if(i==0) urlparams+="?";
    else   urlparams += "&";
    urlparams += "q"+i+"=";
    urlparams += this.charges[i].q + "," + this.charges[i].x + "," + this.charges[i].y;
  }
  $('#totalenergy').html("Total Energy: "+this.TotalEnergy().toFixed(1));
  $('#linktothis').attr('href',urlparams);

  console.time("FindFieldLines");
  this.FindFieldLines()
  console.timeEnd("FindFieldLines");
  
  console.time("Drawing lines")
  this.ctx.lineWidth = 0.02;
  for(var i=0;i<this.fieldLines.length;i++) {
    var line = this.fieldLines[i];
    //console.log("Drawing line ",i);
    this.ctx.strokeStyle = 'black';
    // this.ctx.strokeStyle = 'blue';
    // if(line.startCharge.q >0) this.ctx.strokeStyle = 'red';
    this.ctx.beginPath();
    this.ctx.lineJoin = "round";
    this.ctx.moveTo(line.start_x,line.start_y)
    for(var j=1;j<line.points.length;j++) {
      var p = line.points[j];
      this.ctx.lineTo(p.x,p.y);
    }
    this.ctx.stroke();
    
    // Add arrow. Find the midway point along the line.
    var j = Math.round((line.points.length-1)/2);
    // console.log(j,line.points.length);
    var x = line.points[j].x;
    var y = line.points[j].y;
    // Ensure arrow is on the screen - keep halving the midway point until we reach it.
    while(x<xmin || x>xmax || y<ymin || y>ymax) {
      j = Math.round(j/2);
      x = line.points[j].x;
      y = line.points[j].y;
      //console.log(j);
      if(j<=1) break;
    }
    dx = line.dir*(line.points[j+1].x - x);
    dy = line.dir*(line.points[j+1].y - y);
    this.ctx.save();
    this.ctx.translate(x,y);
    this.ctx.fillStyle = 'black';
    var angle = Math.atan2(dy,dx);
    this.ctx.rotate(angle);
    var lx = 0.2;
    var ly = 0.1;
    this.ctx.beginPath();
    this.ctx.moveTo(lx,0);
    this.ctx.lineTo(0,ly);
    this.ctx.lineTo(0,-ly);
    this.ctx.lineTo(lx,0);
    this.ctx.closePath();
    this.ctx.fill();
    this.ctx.restore();


    // Make dots.
    // for(var j=0;j<line.points.length;j++) {
    //   this.ctx.beginPath();
    //   var p = line.points[j];
    //   this.ctx.arc(p.x,p.y,0.01,0,Math.PI*2,true);
    //   this.ctx.fill(); 
    // }
  }
  console.timeEnd("Drawing lines")

  
  // Draw charges. Do this last so line tails are covered.
  for(var i=0 ;i<this.charges.length; i++) {
    var charge = this.charges[i];    
    this.ctx.fillStyle = 'blue';
    if(charge.q >0) this.ctx.fillStyle = 'red';
    if(charge.highlight) this.ctx.lineWidth = 0.03;
    else                 this.ctx.lineWidth = 0.01;
    var x = charge.x;
    var y = charge.y;
    var r = charge.r;
    //console.log(charge.x,charge.y,charge.r,0,Math.PI*2,true);
    this.ctx.beginPath();
    this.ctx.arc(x,y,r,0,Math.PI*2,true);
    this.ctx.fill();
    this.ctx.stroke();
    this.ctx.save();
    this.ctx.translate(x,y);
    this.ctx.scale(0.01,-0.01);
    this.ctx.fillStyle = 'white';
    this.ctx.strokeStyle = 'white';
    this.ctx.textBaseline = 'middle';
    this.ctx.textAlign = 'center';
    this.ctx.font = '12pt sans-serif';
    var s;
    if(charge.q<0) s = "-";
    else           s = "+";
    s += parseInt(Math.abs(charge.q));
    if(this.ctx.fillText) // protect against old browsers
      this.ctx.fillText(s,0,0);
    this.ctx.restore();
  }
  
  this.ctx.restore();
}

function getAbsolutePosition(element) {
   var r = { x: element.offsetLeft, y: element.offsetTop };
   if (element.offsetParent) {
     var tmp = getAbsolutePosition(element.offsetParent);
     r.x += tmp.x;
     r.y += tmp.y;
   }
   return r;
 };


Applet.prototype.GetEventXY = function(ev)
 {
  // Convert mouse click coordinates to the mathematical plane.
   var offset = getAbsolutePosition(this.canvas);
   var x = ev.pageX;
   var y = ev.pageY;
   // $('#debug').html("DoMouse "+ ev.type + " " + ev.originalEvent.touches.length + " " + x +  " " + y);
  
   if((ev.type =='touchstart') || (ev.type =='touchmove') || (ev.type =='touchend')) {
     ev.preventDefault();
     // $('#debug').html("DoMouse "+ ev.type + " " + ev.originalEvent.touches.length + " " + x +  " " + y);    
     x = ev.originalEvent.touches[0].pageX;
     y = ev.originalEvent.touches[0].pageY;
   }
   x = x - offset.x;
   y = y - offset.y;    
   x -= this.canvas_translate.x;
   y -= this.canvas_translate.y;
   x /= this.canvas_scale.x;
   y /= this.canvas_scale.y;
   return {x:x, y:y};
 }

Applet.prototype.DoMouse = function(ev)
{
  var xy = this.GetEventXY(ev);
  var x = xy.x;
  var y = xy.y;

  // console.log(ev.type,x,y);

  var update = false;
  

  if(ev.type === 'mousedown' || ev.type ==='touchstart') {
    // See if we're clicking a charge.
    var charge = this.FindCollision(x,y);
    if(charge) {
      this.dragging = true;
      this.charge_dragged = charge;
      charge.highlight = true;
      update = true;
    }
  }
  if(ev.type === 'mousemove' || ev.type ==='touchmove') {
    if(this.dragging) {
      this.charge_dragged.x = x;
      this.charge_dragged.y = y;
      update = true;    
    }
  }
  if(ev.type === 'mouseup' || ev.type ==='touchend') {
    if(this.charge_dragged) this.charge_dragged.highlight = false;
    this.charge_dragged = null
    this.dragging = false;
    update = true;
  }
  
  if(ev.type === 'mouseout') {
    if(this.charge_dragged){
      // find it in the list.
      var which = 0;
      for(var i=0;i<this.charges.length;i++) if(this.charge_dragged==this.charges[i]) which=i;
      this.charges.splice(which,1);
      this.charge_dragged = false;
      this.dragging = false;
      update = true;
    }
  }
    
  if(update) this.Draw();
}


Applet.prototype.AddCharge = function(ev)
{
  console.log("AddCharge",ev);
  var q = parseFloat(ev.currentTarget.getAttribute('q'));
  var xy = this.GetEventXY(ev);
  var x = xy.x;
  var y = xy.y;
  
  var charge = { q : q,  x : x,  y: y , r:0.12*Math.abs(q)};
  this.charges.push(charge);
  
  this.dragging = true;
  this.charge_dragged = charge;
  charge.highlight = true;
  update = true;
  
  this.Draw();
}

Applet.prototype.AddChargeRandom = function(ev)
{
  console.log(ev);
  var q = parseFloat(ev.currentTarget.getAttribute('q'));
  console.log(q);
  var xmin = -this.width_x/2;
  var xmax =  this.width_x/2;
  var ymin = -this.width_x/2 * this.canvas.height/this.canvas.width;
  var ymax =  this.width_x/2 * this.canvas.height/this.canvas.width;
  var x = (Math.random()*1.8 - 0.9)*(xmax-xmin)/2;
  var y = (Math.random()*1.8-0.9) *(ymax-ymin)/2;
  this.charges.push({
    q : q,  x : x,  y: y , r:0.12*Math.abs(q)
  });

  this.Draw();
}


Applet.prototype.PrintHQ = function()
{
  console.log("Applet::PrintHQ");
  // First, save our current state.
  var saveCanvas = this.canvas;
  var saveCtx    = this.ctx;
  var saveWidth  = this.width;
  var saveHeight = this.height;

  // Second, create an offscreen drawing context.
  var canvas = document.createElement("canvas");
  this.canvas = canvas;
  canvas.width = saveWidth * gPrintScale;
  canvas.height = saveHeight * gPrintScale;
  // this.width  = saveWidth * gPrintScale;
  // this.height = saveHeight * gPrintScale;
  this.ctx = this.canvas.getContext("2d");

  // Now do the actual draw
  // this.Resize();
  this.ctx.scale(gPrintScale,gPrintScale);
  this.Draw();

  // Save the print result
  gPrintBuffer = this.canvas.toDataURL('image/png');


  // Restore defaults.
  this.canvas = saveCanvas;
  this.ctx    = saveCtx;


  // nuke buffer.
  // document.removeChild(canvas); // Doesn't work. Is this thing a memory leak? I don't think so - I htink the canvas vanishes when it goes out of scope.
};
