var TWO_PI = Math.PI * 2;

var source_lines_per_unit_charge = 10;
var k = 10; // 1/4 pi epsilon naught


// configuration:
var step = 0.06;
var start_step = 0.001;
var max_steps = 1000;


var Utolerance = 0.001;
var step_equi = 0.1;
var max_equi_step = 100;

var potential_multiple = 3;


// A list of random things values from zero to twopi, as trial seeds for directions
var myRandom = [];
for(var r=0;r<7;r++) myRandom.push(Math.PI*2*r/7.);
for(var r=1;r<15;r++) myRandom.push(Math.PI*2*r/15.);
for(var r=2;r<1000;r++) myRandom.push(Math.random()*Math.PI*2);




$(function(){
  applet = new Applet($('div#sim'));
  $('#lines_per_unit_charge').html(source_lines_per_unit_charge);
  
  $('#lines_slider').slider({
    value: source_lines_per_unit_charge,
    min: 3,
    max: 30,
    step: 1,
    slide: function(event,ui) {  source_lines_per_unit_charge = ui.value; 
                                $('#lines_per_unit_charge').html(source_lines_per_unit_charge);
                                applet.Draw(); 
                              }
  });
  


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
                              { q : -2, x : 1.001,   y:-1 , r:Math.sqrt(2)*0.12 },
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

  $('#ctl-do-eqipotential').click(function(){ self.Draw();});
  $('#ctl-zoom-in').click(function(){ self.DoZoom(1); });
  $('#ctl-zoom-out').click(function(){ self.DoZoom(-1); });
  

}

Applet.prototype.DoZoom = function( zoom )
{
  this.width_x -= zoom;
  this.Draw();
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
  var ret = { x: x, y: y,         // Coordinates.
              U: U,              // Potential
              E: E,              // Field magnitude
              Ex: Ex, Ey: Ey,    // Field vector
              gx: Ex/E, gy: Ey/E // Field direction vector
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

function SpansIntegerMultiple(a,b,r)
{
  // Does (a,b) span an a value that is an integer multiple of r?
  var da = Math.floor(a/r);
  var db = Math.floor(b/r);
  if(da==db) return null;
  return Math.max(da,db);

}
function PointTripletOrientation(p,q,r)
{
  // From http://www.geeksforgeeks.org/check-if-two-given-line-segments-intersect/
    // See 10th slides from following link for derivation of the formula
    // http://www.dcs.gla.ac.uk/~pat/52233/slides/Geometry1x1.pdf
    var val = (q.y - p.y) * (r.x - q.x) -
              (q.x - p.x) * (r.y - q.y);
 
    if (val == 0) return 0;  // colinear
 
    return (val > 0)? 1: 2; // clock or counterclock wise
}

function PointOnSegment( p, q, r)
{
    if (q.x <= Math.max(p.x, r.x) && q.x >= Math.min(p.x, r.x) &&
        q.y <= Math.max(p.y, r.y) && q.y >= Math.min(p.y, r.y))
       return true;
 
    return false;
}

function LineSegmentsIntersect(p1,q1,  // first line segment points
                               p2,q2   // second line segment points
                            )
{
  // From http://www.geeksforgeeks.org/check-if-two-given-line-segments-intersect/
  
  // Find the four orientations needed for general and
  // special cases
  var o1 = PointTripletOrientation(p1, q1, p2);
  var o2 = PointTripletOrientation(p1, q1, q2);
  var o3 = PointTripletOrientation(p1, p2, q2);
  var o4 = PointTripletOrientation(q1, p2, q2);

  var d2 = (q2.x-p1.x)*(q2.x-p1.x) + (q2.y-p1.y)*(q2.y-p1.y)
  // console.log("Check for intersection",o1,o2,o3,o4,Math.sqrt(d2),p1,q1,p2,q2);
  // General case
  if ((o1 != o2) && (o3 != o4))
      return true;

  // Not important to us; tested segments should always be nearly perpendicular
  // Special Cases: check for colinearity.
  // p1, q1 and p2 are colinear and p2 lies on segment p1q1
  // if (o1 == 0 && PointOnSegment(p1, p2, q1)) return true;
  //
  // // p1, q1 and p2 are colinear and q2 lies on segment p1q1
  // if (o2 == 0 && PointOnSegment(p1, q2, q1)) return true;
  //
  // // p2, q2 and p1 are colinear and p1 lies on segment p2q2
  // if (o3 == 0 && PointOnSegment(p2, p1, q2)) return true;
  //
  //  // p2, q2 and q1 are colinear and q1 lies on segment p2q2
  // if (o4 == 0 && PointOnSegment(p2, q1, q2)) return true;

  return false; // Doesn't fall in any of the above cases
}



Applet.prototype.FindNodePosition = function(charge)
{
  // If this is a virgin charge. Find seed positions.
  if(charge.nodes.length == 0 && charge.nodesNeeded.length == 0) { 
    this.SeedNodes(charge,0);
  }

  // See if there are some precomputed positions to try.
  if(charge.nodesNeeded && charge.nodesNeeded.length>0) {
    var t = charge.nodesNeeded.shift();
    charge.nodes.push(t);
    return t;
  }


  charge.nodes.sort();
  // bifurcate biggest arc
  var biggest_gap = 0;
  var gap_after = 0;
  for(var i=0;i<charge.nodes.length;i++) {
    var t1 = charge.nodes[i];
    var t2;
    if(i+1 < charge.nodes.length) t2 = charge.nodes[(i+1)];
    else t2 = charge.nodes[(i+1)%charge.nodes.length]+TWO_PI; // wrap around
    var dt = Math.abs(t2-t1);
    // console.log(i,t1,t2,dt);
    if(dt>biggest_gap) { gap_after = i; biggest_gap = dt; }
  }
  var new_node = (charge.nodes[gap_after] + biggest_gap*0.5)%(TWO_PI);
  charge.nodes.push(new_node);
  return new_node;
}


Applet.prototype.FindPositionOfU  = function(input,Utarget,Utolerance)
{
  // Takes an input object: {E: E{E,U,x,y}, x, y}}
  // Returns a similar output object at the best guess for Utarget.
  // Follows the field line at point input.x,input.y until it converges on the Utarget
  
  // We know that U = - delE
  // so by newton-raphson method...
  // distance to go along field line = (U1 - Utarget) / E
  var out = input;
  var it = 0;
  while(Math.abs(out.U - Utarget) > Utolerance) {
    it++;
    var delta = (out.U - Utarget) / out.E;
    var x = out.x + ( delta * out.gx );
    var y = out.y + ( delta * out.gy );
    out = this.Field(x,y);
  }
  // console.log("converge in ", it, "Accuracy: ",out.E.U - Utarget);
  return out;
}


Applet.prototype.SeedNodes = function(charge,startangle)
{
  // // Original algorithm: Space 'needed' nodes around evenly.
  for(var j = 0; j<charge.n_nodes; j++) {
    charge.nodesNeeded.push(
      (startangle + TWO_PI*j/charge.n_nodes)%TWO_PI 
    );
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
  // var spacing = totField/charge.n_nodes;
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
  // if(charge.nodesNeeded.length != charge.n_nodes) console.log("Got wrong number of needed points. Wanted ",charge.n_nodes," got ",charge.nodesNeeded.length);

  // Algorithm 3: track from the very center, using epsilon push away from charge center.
  // for(var j = 0; j<charge.n_nodes; j++) {
  //   var theta = 2*j/charge.n_nodes*Math.PI;
  //   var dir = 1;
  //   if(charge.q<0) dir = -1;
  //   var x = charge.x + 0.01*Math.cos(theta);
  //   var y = charge.y + 0.01*Math.sin(theta);
  //   var deltax = 0;
  //   var deltay = 0;
  //   var d2 = 0;
  //   var nstart = 0;
  //   do {
  //     var E = this.Field(x,y);
  //     var dx = E.gx * step/10;
  //     var dy = E.gy * step/10;
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

  // charge.nodesRequested = charge.nodesNeeded.slice(0);

}


Applet.prototype.DoCollision = function(collide,x,y)
{
  // console.warn("collided with charge that has ",collide.nodesNeeded.length,"left ")
  dx = x-collide.x;
  dy = y-collide.y;
  var angle = (Math.atan2(dy,dx)+TWO_PI)%TWO_PI;
  
  
  collide.nodes.push(angle);
  collide.nodesUsed.push(angle);
  
  if(collide.nodesUsed.length==1) {
    // This is the first line to collide. Seed other positions around this.
    this.SeedNodes(collide,angle);
  }
    
  var best = 0;
  var bestdiff = 9e9;
  for(var k=0; k<collide.nodesNeeded.length;k++){
      var diff = Math.abs( (collide.nodesNeeded[k] - angle)%(2*Math.PI) );
      if(diff<bestdiff) {bestdiff = diff; best = k};
  }
  collide.nodesNeeded.splice(best,1);
  
}


Applet.prototype.TraceFieldLine = function(fieldline)
{
  console.log(fieldline);
  var x = fieldline.start_x;
  var y = fieldline.start_y;
  
  fieldline.points  = [{x:x,y:y}];
  var lastE = this.Field(x,y);

  var traceFinished = false;
  var nstep = 0;
  while(true) {
    nstep++;
    var E = this.Field(x,y);
    
    var dx = E.gx * step *fieldline.dir;
    var dy = E.gy * step *fieldline.dir;

    // Parasitic calculation. Find line segments that cross equipotential lines.
    if(this.do_equipotential) 
    {
      var span = SpansIntegerMultiple(lastE.U, E.U, potential_multiple);
      if(span!=null) {
        pnode = { U: span*potential_multiple, E1: lastE, E2: E };
        this.potentialnodes.push(pnode);
      }
    }
    
    // This check doesn't work.
    // I've also tried the form of E/U, which should check for small field in high-potential areas (which is what I want to check)
    // I can't just check for small field, because that happens naturally at large distances from the middle.
    // if(Math.abs(E.E) < 1 && Math.abs(E.U) > 2) {
    //   console.log("Line went through effective zero-field region. This isn't a good line. E=",E.E," U=",E.U, " step=",step);
    //   return false;
    // }
    
    x += dx;
    y += dy;
    fieldline.points.push({x:x,y:y});        
    lastE = E;

  
    var collide = this.FindCollision(x,y);
    if(collide && (fieldline.dir*collide.q < 0) && nstep>1) {
      // Find the best possible node for this line.
      if(collide.n_nodes >= collide.nodes.length+1 == 0) {
        console.warn("Line failed - hit q=",collide.q,"which has no nodes left.");
        return false; //nodeFinished=false; 
      } else {
        this.DoCollision(collide,x,y);
        fieldline.endCharge = collide;
        fieldline.nstep = nstep;
        console.log("Line succeeded - hit q=",collide.q);
        return true; // nodeFinished
      }
    }
              
    if(nstep>max_steps){
      fieldline.endCharge = null;
      fieldline.endAngle     = null;
      fieldline.endNodeAngle = null;
      fieldline.nstep = nstep;
      console.log("Line succeeded - no hit");
      return true;
    }  // if nstep 
  } // trace loop
}



Applet.prototype.FindFieldLines = function()
{
  

  this.fieldLines = [];
  this.potentialnodes = []; 
  this.equipotential_lines = [];


  var total_charge = 0;
  var max_x = -1e20;
  var min_x =  1e20;
  var max_y = -1e20;
  var min_y =  1e20;
  var max
  for(var i=0 ;i<this.charges.length; i++) {
    var charge = this.charges[i];
    total_charge += charge.q;
    charge.r = 0.12*Math.sqrt(Math.abs(charge.q));
    charge.n_nodes = Math.round(Math.abs(source_lines_per_unit_charge*charge.q));
    charge.nodes = []; // All successful or unsuccesful nodes
    charge.nodesUsed = []; // Nodes that have actually worked.
    charge.nodesNeeded = []; // Some idea what nodes we should try.
    if(charge.x > max_x) max_x = charge.x;
    if(charge.x < min_x) min_x = charge.x;
    if(charge.y > max_y) max_y = charge.y;
    if(charge.y < min_y) min_y = charge.y;
  }
  

  // rank them. Use minority charge carriers first: their nodes HAVE to connect.
  this.charges.sort(chargesort);
  if(total_charge<0) this.charges.reverse();

  console.log("Doing escaping lines -------------- ");
  // Find fieldlines that come from outside the area, assuming there is a majority charge carrier.
  var escaping_lines = Math.abs(total_charge* source_lines_per_unit_charge);
  for(var i=0;i<escaping_lines;i++) {
    console.log("Doing escaping line.");
    // Find a position very far away from the charges.
    var r = Math.max(this.xmax,this.ymax) * 10;
    if(isNaN(r)) r = 10;
    var theta = i*2*3.14159/escaping_lines;
    var x =  r*Math.cos(theta);
    var y =  r*Math.sin(theta);
    
    var fieldline = { startCharge: null };
    if(total_charge > 0)  fieldline.dir = -1;
    else                  fieldline.dir = 1;
    fieldline.start_x = x;
    fieldline.start_y = y;
    fieldline.start = "outside";
    var nodeFinished = this.TraceFieldLine(fieldline); 
    if(nodeFinished) {
      this.fieldLines.push(fieldline);      
    } else {
      console.log("incoming line failed");
    }
    
  }
  


  // Now loop through again, finding unused nodes and tracing field lines from those
  // nodes until they either hit another charge or they require too many computational cycles.

  for(var i=0 ;i<this.charges.length; i++) {
    var random_seed = 0;
    var charge = this.charges[i];    
    // console.log("Find field lines for charge ",i," with charge ",charge.q);
    this.ctx.fillStyle = 'blue';
    console.log("Doing charge",i,"with q=",charge.q,"which has ",charge.nodesUsed.length,"/",charge.n_nodes," nodes");


    while(charge.nodesUsed.length < charge.n_nodes && charge.nodes.length<source_lines_per_unit_charge*5) {
      if(charge.nodes.length>source_lines_per_unit_charge*4) {
        console.warn("Wow! Tried way too many nodes.",charge.nodes);
      }
      console.log("Doing node on charge",i);
      
      var start_angle = this.FindNodePosition(charge);

      var r = charge.r;
      // Boost in initial direction by radius.
      var fieldline = { startCharge: charge };
      fieldline.start = "charge";
      var nodeFinished = false;

      // console.log("Try: ",nodeTries,"Trying angle:",start_angle*180/Math.PI,nodeTries);
      fieldline.start_x = charge.x + charge.r* Math.cos(start_angle);
      fieldline.start_y = charge.y + charge.r* Math.sin(start_angle);
      fieldline.start_angle = start_angle;
      var dir = 1;
      if(charge.q<0) dir = -1;
      fieldline.dir     = dir;
      
      var nodeFinished = this.TraceFieldLine(fieldline); 
      if(nodeFinished) {
        charge.nodesUsed.push(start_angle);
        this.fieldLines.push(fieldline);      
      }
    } // nodeFinished
  }
  
  if(this.do_equipotential){
  // Find equipotential lines.
  // Trace around all the equpotenial nodes we've found.
  console.log("looking at potentialnodes: ", this.potentialnodes.length);

  while(this.potentialnodes.length>0) {
    var pnode = this.potentialnodes.shift();
    var Utarget = pnode.U;
    // Fresh node. Approximate the point of best potential.
    console.log("Trying node, Utarget=",Utarget);

    var point = pnode.E1;  // Pick one of the two end segments.
    point = this.FindPositionOfU(point,Utarget,Utolerance);
    var xstart = point.x;
    var ystart = point.y;
    // var fU = (pnode.U - pnode.E1.U)/(pnode.E2.U-pnode.E1.U);
    // if(pnode.E2.U < pnode.E1.U) fU = -fU;
    // var startx = pnode.x1 + fU*(pnode.x2-pnode.x1);
    // var starty = pnode.y1 + fU*(pnode.y2-pnode.y1);
    // var startE = this.Field(startx,starty);
    // Start tracing this equpotential back and forth.
    for(var dir = -1; dir<3; dir +=2) {
      var line = {U: Utarget, points:[{x:point.x,y:point.y}]};
      var done = false;
      // console.log("start line at",startE.U,pnode.U,pnode);
      var np = 0;
      while(!done) {
        np++;
        // console.log(point);
        var newx =  point.x + point.gy * step_equi * dir;  // Not a typo. .
        var newy =  point.y - point.gx * step_equi * dir;  // We're going perpendicular to the field!
        var next_point = this.Field(newx,newy);        
        var next_point = this.FindPositionOfU(next_point,Utarget,Utolerance); // refine
        
        // Check for intersection with other potentialnodes. Delete them as we go.
        for(var i=0;i<this.potentialnodes.length;i++) {
            var othernode = this.potentialnodes[i];
            if(othernode.U == Utarget) {
              if(LineSegmentsIntersect(point,next_point,
                                       othernode.E1, othernode.E2)) {
              console.warn("collide with node!  left:",this.potentialnodes.length);
              this.potentialnodes.splice(i,1);
            }
          }
        }
        // var d2 = (next_point.x - xstart)*(next_point.x - xstart)+(next_point.y - ystart)*(next_point.y - ystart);
        // console.log("distance from start: ",Math.sqrt(d2));
        if(np>2 && LineSegmentsIntersect(point,next_point,
                                          pnode.E1,pnode.E2))  {
          done = true;
          dir+=2; // exit dir loop
          console.warn("looped line");
        } else if(np>max_equi_step){
          console.warn('gave up on line');
          done = true;
        } 
        line.points.push({x:next_point.x,y:next_point.y});
        point = next_point;
        // console.log(E.U);
      }
      this.equipotential_lines.push(line);
      console.log("End U at",point.E.U);
    }
    // break;
  }
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
  
  this.do_equipotential = $('#ctl-do-eqipotential').is(":checked");
  
  this.canvas_translate = { x: this.canvas.width/2, y: this.canvas.height/2};
  this.canvas_scale     = { x: this.canvas.width/this.width_x, y: -this.canvas.width/this.width_x};
  
  this.ctx.translate(this.canvas_translate.x,this.canvas_translate.y);
  this.ctx.scale(this.canvas_scale.x,this.canvas_scale.y);
  this.xmin = -this.width_x/2;
  this.xmax =  this.width_x/2;
  this.ymin = -this.width_x/2 * this.canvas.height/this.canvas.width;
  this.ymax =  this.width_x/2 * this.canvas.height/this.canvas.width;
  
  this.ctx.strokeStyle = 'black';
  this.ctx.lineWidth = 0.01;
  this.ctx.beginPath();
  this.ctx.moveTo(this.xmin,this.ymin);
  this.ctx.lineTo(this.xmax,this.ymin);
  this.ctx.lineTo(this.xmax,this.ymax);
  this.ctx.lineTo(this.xmin,this.ymax);
  this.ctx.lineTo(this.xmin,this.ymin);
  this.ctx.stroke();
  this.ctx.beginPath();
  
  var urlparams = "";
  for(var i = 0; i< this.charges.length; i++) {
    if(i==0) urlparams+="?";
    else   urlparams += "&";
    urlparams += "q"+i+"=";
    urlparams += this.charges[i].q + "," + parseFloat(this.charges[i].x.toFixed(3)) + "," + (parseFloat(this.charges[i].y.toFixed(3)));
  }
  $('#totalenergy').html("Total Energy: "+this.TotalEnergy().toFixed(1));
  $('#linktothis').attr('href',urlparams);

  console.time("FindFieldLines");
  this.FindFieldLines()
  console.timeEnd("FindFieldLines");
  
  this.DrawFieldLines();
  this.DrawCharges();
  if(this.do_equipotential) this.DrawEquipotentialLines();
  
  this.ctx.restore();
  
}

Applet.prototype.DrawFieldLines = function()
{ 
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
    
    var n = line.points.length;
    // Add arrow. Find the midway point along the line.
    var j = Math.round((n-1)/2);
    // console.log(j,line.points.length);
    var x = line.points[j].x;
    var y = line.points[j].y;
    // Ensure arrow is on the screen - keep halving the midway point until we reach it.
    while(x<this.xmin || x>this.xmax || y<this.ymin || y>this.ymax) {
      if(line.start == "outside") j = Math.round(n-(n-j)/2);
      else                        j = Math.round(j/2);
      x = line.points[j].x;
      y = line.points[j].y;
      //console.log(j);
      if(j<=1 || j>=n-3) break;
    }
    dx = line.dir*(line.points[j+1].x - x);
    dy = line.dir*(line.points[j+1].y - y);
    this.ctx.save();
    this.ctx.translate(x,y);
    this.ctx.fillStyle = 'black';
    var angle = (Math.atan2(dy,dx)+TWO_PI)%TWO_PI;
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

}

Applet.prototype.DrawEquipotentialLines = function()
{ 
  console.time("Drawing potential lines")

  for(var i=0;i<this.equipotential_lines.length;i++) {
    var line = this.equipotential_lines[i];
    this.ctx.beginPath();
    this.ctx.lineWidth = 0.02;
    this.ctx.strokeStyle = "green";
    this.ctx.lineJoin = "round";
    this.ctx.moveTo(line.points[0].x,line.points[0].y)
    for(var j=1;j<line.points.length;j++) {
      var p = line.points[j];
      this.ctx.lineTo(p.x,p.y);
    }
    this.ctx.stroke();

    this.ctx.strokeStyle = "black";
    this.ctx.lineWidth = 0.01;
    
    // Make dots.
    // for(var j=0;j<line.points.length;j++) {
    //   this.ctx.beginPath();
    //   var p = line.points[j];
    //   this.ctx.arc(p.x,p.y,0.01,0,Math.PI*2,true);
    //   this.ctx.stroke();
    // }
  }
  console.timeEnd("Drawing potential lines")

}

Applet.prototype.DrawCharges = function()
{
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

    // Draw attempted node positions, for debugging
    // for(var j=0;j<charge.nodes.length;j++) {
    //   var t= charge.nodes[j];
    //   x = charge.x + r*Math.cos(t);
    //   y = charge.y + r*Math.sin(t);
    //   this.ctx.beginPath();
    //   this.ctx.arc(x,y,r/5,0,Math.PI*2,true);
    //   this.ctx.stroke();
    // }

    this.ctx.save();
    this.ctx.translate(charge.x,charge.y);
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
   //$('#debug').html("DoMouse "+ ev.type + " " + ev.originalEvent.touches.length + " " + x +  " " + y);    
  
   if((ev.type =='touchstart') || (ev.type =='touchmove') || (ev.type =='touchend')) {
     ev.preventDefault();
     //$('#debug').html("DoMouse "+ ev.type + " " + ev.originalEvent.touches.length + " " + x +  " " + y);    
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
  
  var charge = { q : q,  x : x,  y: y , r: 0.12*Math.sqrt(Math.abs(q))};
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
  this.xmin = -this.width_x/2;
  this.xmax =  this.width_x/2;
  this.ymin = -this.width_x/2 * this.canvas.height/this.canvas.width;
  this.ymax =  this.width_x/2 * this.canvas.height/this.canvas.width;
  var x = (Math.random()*1.8 - 0.9)*(this.xmax-this.xmin)/2;
  var y = (Math.random()*1.8-0.9) *(this.ymax-this.ymin)/2;
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
