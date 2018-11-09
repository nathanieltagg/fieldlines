/*
###################################################
### 	TODO									###
### 	Make it so I can add charges			###
### 	Make it is so the node rotates when hit ###
###			-RotatePhi does not work correctly  ###
###		Optimize SeedNodes						###
###		Add link to download picture of lines	###
###################################################
*/

//
var TWO_PI = Math.PI * 2;

var source_lines_per_unit_charge = 6;
var k = 10; // 1/4 pi epsilon naught

// configuration:
var step = 5;
var start_step = 0.001;
var max_steps = 2000;
var Utolerance = 0.001;
var step_equi = 0.1;
var max_equi_step = 100;
var potential_multiple = 3;
var hide_charge_values = false;

var total_charge = 0;
var max_x =  -1e20;
var min_x =  1e20;
var max_y =  -1e20;
var min_y =  1e20;
this.trans = Matrix.I(4);
this.chargeSelected = false;
this.draggingCharge = false;
$(function(){
	gPolar3d = new EField3d($('#viewport'));
	$('#lines_per_unit_charge').html(source_lines_per_unit_charge);  
	$('#lines_slider').slider({
    	value: source_lines_per_unit_charge,
    	min: 3,
    	max: 26,
    	step: 1,
    	slide: function(event,ui) {  source_lines_per_unit_charge = ui.value; 
    	                            $('#lines_per_unit_charge').html(source_lines_per_unit_charge);
									gPolar3d.StartDraw();
    	                          }
  });
  // see if there's an override in the URL
  gPolar3d.charges = [];
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
      gPolar3d.charges.push({q:parseFloat(list[0]),
                         x:parseFloat(list[1]),
                         y:parseFloat(list[2]),
                         z:parseFloat(list[3])});
    }
  }

	if(urlParams.lines) { source_lines_per_unit_charge = urlParams.lines; }
	// if(urlParams.phi) { gPolar3d.rotateMe(0,urlParams.phi);}
	// if(urlParams.theta) { gPolar3d.rotateMe(urlParams.theta,0);}
/*
  $('#downloadlink').bind('click' ,function(ev) { 
    
    var dt = applet.canvas .toDataURL('image/png');
    this.href = dt;
    
    // return DoPrint($('#everything'),true);  
  });*/
  

  	gPolar3d.StartDraw();
});
EField3d.prototype = new Pad3d;           
EField3d.prototype.constructor = EField3d;
function EField3d( element, options ){
  // console.log('TriDView ctor');
  if(!element) {
    // console.log("TriDView: NULL element supplied.");
    return;
  }
  if($(element).length<1) { 
    return;   
  }
  
  var settings = {
    default_look_at:    [0,0,0],
    default_camera_distance: 800,
    camera_distance_max: 8000,
    camera_distance_min: 50,
    default_theta: -0.1,
    default_phi: 0.5,
  }
  $.extend(true,settings,options);  // Change default settings by provided qualities.
  Pad3d.call(this, element, settings); // Give settings to Pad contructor.
  this.ResetView();
  this.gSetupDirty = true;
  
}
EField3d.prototype.StartDraw = function(){
	this.objects = [];
    if(this.charges.length==0) this.charges = [
                                { q :  1, x : 150,  y: -50, z: 80},
                                // { q : -1, x : 51,  y: 50,  z: -150},
                                { q :  1, x : -151, y: -150, z: 200},
                                { q : -1, x : -50, y: 50,  z: 100},
                                ];

  
	var urlparams = "";
	for(var i = 0; i< this.charges.length; i++) {
	  if(i==0) urlparams+="?";
	  else   urlparams += "&";
	  urlparams += "q"+i+"=";
	  urlparams += this.charges[i].q + "," + parseFloat(this.charges[i].x.toFixed(3)) + "," + (parseFloat(this.charges[i].y.toFixed(3))) + "," + (parseFloat(this.charges[i].z.toFixed(3)));
	  //I attempted to make it keep the same rotation from when you get the link
      // urlparams+="&phi=" + this.phi;
	  // urlparams+="&theta=" + this.theta;
	}
	  urlparams+="&lines=" + source_lines_per_unit_charge;
	$('#linktothis').attr('href',urlparams);
	this.DrawCharges();
    this.FindFieldLines();
	this.DrawFieldLines();
	this.Draw();
}
EField3d.prototype.DrawCharges = function(){
	this.FindTranslationalMatrix();
    for(var i=0 ;i<this.charges.length; i++) {
      var charge = this.charges[i];
	  this.FindChargePosition(charge);
      total_charge += charge.q;
	  charge.times_seeded = 0;
      charge.r = 10*Math.abs(charge.q);
      charge.n_nodes = Math.round(Math.abs(source_lines_per_unit_charge*charge.q));
      charge.nodes = []; // All successful or unsuccesful nodes
      charge.nodesUsed = []; // Nodes that have actually worked.
      charge.nodesNeeded = []; // Some idea what nodes we should try.
      charge.collisions = []; // where the charge was hit
      if(charge.x > max_x) max_x = charge.x;
      if(charge.x < min_x) min_x = charge.x;
      if(charge.y > max_y) max_y = charge.y;
      if(charge.y < min_y) min_y = charge.y;
	  
	  if(charge.q>0){
		  this.AddPoint(charge.x,charge.y,charge.z,charge.r,"RED","ORANGE",charge);
	  }else if(charge.q<0){
		  this.AddPoint(charge.x,charge.y,charge.z,charge.r,"BLUE","GREEN",charge);
	  }
    }
    this.charges.sort(chargesort);
    if(total_charge<0) this.charges.reverse();
	this.Draw();
}
EField3d.prototype.FindTranslationalMatrix = function(){
    var trans = Matrix.I(4);
    trans = this.Translate(trans,-this.look_at[0],-this.look_at[1],-this.look_at[2]);
    trans = this.RotateY(trans,this.phi);
    trans = this.RotateX(trans,this.theta);
    trans = this.Translate(trans,0,0,this.camera_distance);
	this.trans = trans;
}
EField3d.prototype.FindChargePosition = function(charge){
	//Must call this.FindTranslationalMatrix() first
	var p1 = this.trans.x(Vector.create([charge.x,charge.y,charge.z,1]));
    charge.u =  p1.e(1)/p1.e(3)*this.proj_dist;
    charge.v =  p1.e(2)/p1.e(3)*this.proj_dist;
	charge.tranz = p1.e(3);
}
EField3d.prototype.SetXYCoords = function(charge,u,v){
	var XYZVector = Vector.create([u / this.proj_dist * charge.tranz,v / this.proj_dist * charge.tranz,charge.tranz,1]);
	var inverseTrans = this.trans.inverse();
	if(inverseTrans){
		var a = inverseTrans.x(XYZVector);
		charge.x = a.e(1);
		charge.y = a.e(2);
		charge.z = a.e(3);
		this.FindChargePosition(charge);
	}
	
}
EField3d.prototype.FindFieldLines = function(){
	
    this.fieldLines = [];
	
    for(var i=0 ;i<this.charges.length; i++) {
      var charge = this.charges[i];
      // console.log("Doing charge",i,"with q=",charge.q,"which has ",charge.nodesUsed.length,"/",charge.n_nodes," nodes");


      while(charge.nodesUsed.length < charge.n_nodes && charge.nodes.length<source_lines_per_unit_charge*5) {
        if(charge.nodes.length>source_lines_per_unit_charge*4) {
          console.warn("Wow! Tried way too many nodes.",charge.nodes);
        }
      
        var start_angle = this.FindNodePosition(charge);
        var r = charge.r;
        // Boost in initial direction by radius.
        var fieldline = { startCharge: charge };
        fieldline.start = "charge";
		
		
		fieldline.start_x = charge.x + charge.r*Math.sin(start_angle.phi)*Math.cos(start_angle.theta);
		fieldline.start_y = charge.y + charge.r*Math.sin(start_angle.phi)*Math.sin(start_angle.theta);
		fieldline.start_z = charge.z + charge.r*Math.cos(start_angle.phi);
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
}
EField3d.prototype.TraceFieldLine = function(fieldline){
  // console.log(fieldline);
  var x = fieldline.start_x;
  var y = fieldline.start_y;
  var z = fieldline.start_z;
  
  fieldline.points  = [{x:x,y:y,z:z}];
  var lastE = this.Field(x,y,z);

  var traceFinished = false;
  var nstep = 0;
  while(true) {
    nstep++;
    var E = this.Field(x,y,z);
    
    var dx = E.gx * step *fieldline.dir;
    var dy = E.gy * step *fieldline.dir;
    var dz = E.gz * step *fieldline.dir;
    
    // This check doesn't work.
    // I've also tried the form of E/U, which should check for small field in high-potential areas (which is what I want to check)
    // I can't just check for small field, because that happens naturally at large distances from the middle.
    // if(Math.abs(E.E) < 1 && Math.abs(E.U) > 2) {
    //   console.log("Line went through effective zero-field region. This isn't a good line. E=",E.E," U=",E.U, " step=",step);
    //   return false;
    // }
    
    x += dx;
    y += dy;
    z += dz;
    fieldline.points.push({x:x,y:y,z:z});
    lastE = E;
    var collide = this.FindCollision(x,y,z);
    if(collide && (fieldline.dir*collide.q < 0) && nstep>1) {
      // Find the best possible node for this line.
      if(collide.n_nodes >= collide.nodes.length+1 == 0) {
        // console.log("Line failed - hit q=",collide.q,"which has no nodes left.");
        // Comment these lines out if you want it to just sail through without stopping...
        // console.warn("Line failed - hit q=",collide.q,"which has no nodes left.");
        return false; //nodeFinished=false;
      } else {
        this.DoCollision(collide,x,y,z);
        fieldline.endCharge = collide;
        fieldline.nstep = nstep;
        // console.log("Line succeeded - hit q=",collide.q);
        return true; // nodeFinished
      }
    }
	
    if(nstep>max_steps){
      fieldline.endCharge = null;
      fieldline.endAngle     = null;
      fieldline.endNodeAngle = null;
      fieldline.nstep = nstep;
      // console.log("Line succeeded - no hit");
      return true;
    }  // if nstep
	 
  } // trace loop
}
EField3d.prototype.DrawFieldLines = function(){
	for(var k = 0; k < this.fieldLines.length; k++){
		for(var q = 0; q < this.fieldLines[k].points.length - 1; q++){
			var p = this.fieldLines[k].points;
			this.AddLine(p[q].x,p[q].y,p[q].z,p[q+1].x,p[q+1].y,p[q+1].z,1,"BLACK",null);
		}
		this.AddArrows(this.fieldLines[k]);
	}
}
EField3d.prototype.FindNodePosition = function(charge){
  // If this is a virgin charge. Find seed positions.
  if(charge.nodes.length == 0 && charge.nodesNeeded.length == 0) {
    this.SeedNodes(charge,{theta: 0, phi: 0});
  }
  // See if there are some precomputed positions to try.
  if(charge.nodesNeeded && charge.nodesNeeded.length>0) {
    var t = charge.nodesNeeded.shift();
	// console.log(t);
    charge.nodes.push(t);
    return t;
  }
  
//try to seed it again,this time with more nodes
  this.SeedNodes(charge,{theta: 0, phi: 0});
  if(charge.nodesNeeded && charge.nodesNeeded.length>0) {
    var t = charge.nodesNeeded.shift();
    charge.nodes.push(t);
    return t;
  }
  
}
EField3d.prototype.SeedNodes = function(charge,startangle){
	
	//	THIS FUNCTION NEEDS TO BE COMPLETELY REMADE.
	//	IT WORKS, BUT IT DOES NOT EVEN ATTEMPT 
	//	TO MAKE THE NODES EVENLY SPACED.
	var n = 0;
	var q = 0;
	while(charge.n_nodes > 2 * (n*n - n + 1)){ n++; }
	n += charge.times_seeded;
	charge.times_seeded++;
	for(var i = 0; i<2 * (n*n - n + 1); i++) {
	  if(((i+q) % (1 * n) == 0) && i > n){ q++; }
	  var theta = Math.floor((i+q)/(2*n)) * Math.PI/n;
  	  var phi = ((i + q) %(2*n)) * Math.PI/n;
	  // console.log("phi: ",phi);
	  // console.log("theta: ",theta);
	  
	  //This was to try and rotate where we seeded the nodes when it was hit so where a field line collided with it is the first node.
	  /* 
	  var a = {x: r*Math.sin(phi)*Math.cos(theta) ,y: r*Math.sin(phi)*Math.sin(theta) ,z: r*Math.cos(phi)};
	  var b = RotateTheta(
		  {x: r*Math.sin(phi)*Math.cos(theta) ,y: r*Math.sin(phi)*Math.sin(theta) ,z: r*Math.cos(phi)},
		  startangle.theta);
	  
	  
	  var a = RotatePhi(RotateTheta(
		  		  {x: r*Math.sin(phi)*Math.cos(theta) ,y: r*Math.sin(phi)*Math.sin(theta) ,z: r*Math.cos(phi)},
			  startangle.theta),startangle.phi);
	  */
	  charge.nodesNeeded.push({theta:theta,phi:phi});
	  // charge.nodesNeeded.push(GetAngle({x: r*Math.sin(phi)*Math.cos(theta) ,y: r*Math.sin(phi)*Math.sin(theta) ,z: r*Math.cos(phi)}));
/*
	  charge.nodesNeeded.push( 
		  GetAngle(
			  RotatePhi(
				  RotateTheta(
					  {x: r*Math.sin(phi)*Math.cos(theta) ,y: r*Math.sin(phi)*Math.sin(theta) ,z: r*Math.cos(phi)},
				  startangle.theta)
			  ,startangle.phi)));
	  */
  }
}
EField3d.prototype.AddArrows = function(fieldline){
	var n = fieldline.points.length;
	if(n > 500){ for(var i = 1; i < Math.floor(n / 200); i++) {if(n - Math.round(n / Math.floor(n / 200)) * i > 50){
		this.AddArrow(fieldline.points[Math.round(n / Math.floor(n / 200)) * i],
		fieldline.points[Math.round(n / Math.floor(n / 200)) * i - fieldline.dir]);
	}}}
	else{
		this.AddArrow(fieldline.points[Math.round(n / 2)], fieldline.points[Math.round(n/2)-fieldline.dir]);
	}
}
EField3d.prototype.AddArrow = function(point,prevPoint){
	var arrow = Vector.create([point.x - prevPoint.x, point.y - prevPoint.y, point.z - prevPoint.z]);
	if(!arrow.isParallelTo(Vector.i)){
		var p1 = arrow.cross(Vector.i);
		p1 = p1.toUnitVector();
		p1 = p1.x(0.5);
		var arrowLength = 20/step;
		var arrowAxis = Line.create([0,0,0],[arrow.e(1),arrow.e(2),arrow.e(3)]);
		for(var i = 0; i < 4; i ++){
			var arrowLine = Vector.create([prevPoint.x+p1.e(1)-point.x,prevPoint.y+p1.e(2)-point.y,prevPoint.z+p1.e(3)-point.z]);
			this.AddLine(point.x,point.y,point.z,point.x+arrowLength*arrowLine.e(1),point.y+arrowLength*arrowLine.e(2),point.z+arrowLength*arrowLine.e(3),1,"BLACK",null);
			p1 = p1.rotate(2*Math.PI/4,arrowAxis);
		}
	}else if(!arrow.isParallelTo(vector.j)){
		var p1 = arrow.cross(Vector.j);
		p1 = p1.toUnitVector();
		p1 = p1.x(0.5);
		var arrowLength = 5;
		var arrowAxis = Line.create([0,0,0],[arrow.e(1),arrow.e(2),arrow.e(3)]);
		for(var i = 0; i < 4; i ++){
			var arrowLine = Vector.create([prevPoint.x+p1.e(1)-point.x,prevPoint.y+p1.e(2)-point.y,prevPoint.z+p1.e(3)-point.z]);
			this.AddLine(point.x,point.y,point.z,point.x+arrowLength*arrowLine.e(1),point.y+arrowLength*arrowLine.e(2),point.z+arrowLength*arrowLine.e(3),1,"BLACK",null);
			console.log(p1);
			p1 = p1.rotate(2*Math.PI/4,arrowAxis);
		}
	}
}
EField3d.prototype.Field = function(x,y,z){
  var Ex = 0;
  var Ey = 0;
  var Ez = 0;
  var U  = 0;
  var dUdx = 0;
  for(var i=0 ;i<this.charges.length; i++) {
    var c = this.charges[i];
    var dx = x-c.x;
    var dy = y-c.y;
    var dz = z-c.z;
    var r2 = dx*dx+dy*dy+dz*dz;
    var r = Math.sqrt(r2);
    var E = c.q/r2;
    Ex += dx/r*E;
    Ey += dy/r*E;
    Ez += dz/r*E;
    U += c.q/r;
  }
  var E2 = Ex*Ex + Ey*Ey + Ez*Ez;
  var E = Math.sqrt(E2);
  var ret = { x: x, y: y, z: z,  			// Coordinates.
              U: U,              			// Potential
              E: E,              			// Field magnitude
	  		  Ex: Ex, Ey: Ey, Ez: Ez,    	// Field vector
		  	  gx: Ex/E, gy: Ey/E, gz: Ez/E 	// Field direction vector
              };
  // console.log("Field at "+x+","+y,ret);
  return ret;
}
EField3d.prototype.FindCollision = function(x,y,z){
  for(var i=0 ;i<this.charges.length; i++) {
    var c = this.charges[i];
    var dx = x-c.x;
    var dy = y-c.y;
    var dz = z-c.z;
    var r2 = dx*dx+dy*dy+dz*dz;
    var cr = c.r-0.01;
    if(r2 < (cr*cr)) {
      return c;
    }
  }
  return null;
}
EField3d.prototype.DoCollision = function(collide,x,y,z){
  // console.warn("collided with charge that has ",collide.nodesNeeded.length,"left ")
  collide.collisions.push({x:x,y:y,z:z});
  dx = x-collide.x;
  dy = y-collide.y;
  dz = z-collide.z;
  var angle = GetAngle({x:dx,y:dy,z:dz});
  
  
  collide.nodes.push(angle);
  collide.nodesUsed.push(angle);
  
  if(collide.nodesUsed.length==1) {
    // This is the first line to collide. Seed other positions around this.
	  
	  //If SeedNodes is fixed to be able to rotate the angle change the following line.
    this.SeedNodes(collide,{phi:0,theta:0});
    // this.SeedNodes(collide,angle);
  }
    
  var best = 0;
  var bestdiff = 9e9;
  for(var k=0; k<collide.nodesNeeded.length;k++){
      var diff = GetDiff(collide.nodesNeeded[k],angle);
      if(diff<bestdiff) {bestdiff = diff; best = k};
  }
  collide.nodesNeeded.splice(best,1);
}
function RotateTheta(a, angle){
	var b = {
		x: a.x*Math.cos(angle)-a.y*Math.sin(angle),
		y: a.x*Math.sin(angle)-a.y*Math.cos(angle),
		z: a.z
	};
	return b;
}
function RotatePhi(a, angle){
	//This doesn't work, don't even try to understand it, just remake it.
	if(angle == 0) return a;
	var k = {x:-a.y / Math.sqrt(a.x*a.x + a.y*a.y),y: a.x / Math.sqrt(a.x*a.x + a.y*a.y), z: 0};
	var dot = k.x*a.x + k.y*a.y;
	var c = Math.cos(angle);
	var s = Math.sin(angle);
	var b = {
		x: c*a.x + dot*(1-c)*k.x + s*k.y*a.z,
		y: c*a.y + dot*(1-c)*k.y - s*k.z*a.z,
		z: c*a.z + (k.x*a.y-k.y*a.x)*s
	};
	return b;
}
function chargesort(a,b){
  var cmp = a.q - b.q;
  if(cmp==0) cmp = a.y - b.y;
  return cmp;
}
function GetDiff(angle1,angle2){
	var a = {x: Math.sin(angle1.phi)*Math.cos(angle1.theta), y: Math.sin(angle1.phi)*Math.sin(angle1.theta), z: Math.cos(angle1.phi)};
	var b = {x: Math.sin(angle2.phi)*Math.cos(angle2.theta), y: Math.sin(angle2.phi)*Math.sin(angle2.theta), z: Math.cos(angle2.phi)};
	return Math.abs( Math.acos( Dot(a,b) ) % (TWO_PI) );
}
function GetAngle(a){ return {theta: Math.atan(a.y/a.x), phi: Math.atan(Math.sqrt(a.x*a.x+a.y*a.y)/a.z)}; }	
function Dot(a,b){ return a.x * b.x + a.y * b.y + a.z * b.z; }
EField3d.prototype.mouseMove = function(ev){
	// if(this.dragging){
	// this.drag(ev);
	//   	// return;
	//   }
  // Called for any movement in pad.  
  // find highlighed object.
  // go through object list from back to front, so that the frontmost object will highlight.	
	
  var offset = getAbsolutePosition(this.canvas);
  var x = ev.pageX - offset.x;
  var y = ev.pageY - offset.y;    
  var u = this.width/2 -x;  // Translate and flip inverse to screen coords
  var v = this.height/2-y;
  

  var selected = null;
  for(var i=0;i<this.objects.length;i++)
  {
    var obj = this.objects[i];
    // Only compute if object is selectable: i.e. it has a reference source (is not scenery)
    if(obj.source){
      if(obj.type=='l') {
        // if(sample++%100==0) console.log(obj.source,
        //                                 u,v,obj.au,obj.av,obj.bu,obj.bv,
        //                                 GeoUtils.line_to_point(u,v,obj.au,obj.av,obj.bu,obj.bv));
        if( GeoUtils.line_is_close_to_point(u,v,obj.au,obj.av,obj.bu,obj.bv,
          this.mouse_highlight_range*this.proj_dist/obj.meanz) )
          selected = obj.source; 
        }
      }
      if(obj.type=='p') {
		  if(obj.selected){
	  		obj.selected = false;
			this.Draw();
		  }
        var du = u - obj.au;
        var dv = v - obj.av;
        var d = Math.sqrt(du*du+dv*dv);
        if( d < this.mouse_highlight_range*this.proj_dist/obj.meanz ){
			obj.selected = true;
			this.DrawObj(obj);
        	selected = obj.source;
        }
      }
  }
  if(selected) this.HoverObject(selected);
	if(this.dragging){
	this.drag(ev);
  	// return;
  }
}
EField3d.prototype.drag = function(ev){
	  // Called for any movement in page.
	  if(!this.dragging)  return;  
	   var x = ev.pageX;
	   var y = ev.pageY;
	   console.log("dragging....."+ev.type+" "+x+" "+y);
	   if(ev.originalEvent.touches) {
	     if(ev.originalEvent.touches) console.log("Touches avalable");
	     if (ev.originalEvent.touches.length > 1) {this.dragging = false; return; } // don't allow multi-touch
	     x = ev.originalEvent.touches[0].pageX;
	     y = ev.originalEvent.touches[0].pageY;       
	     ev.originalEvent.preventDefault();       
	     console.log("Touch: " + x + " " + y)
	   } else {
	     if(this.startDragTouch) return; // Avoid processing a fake mousemove event when running ios.
	   }
	   if(!this.chargeSelected){
	   		var dx = (x - this.startDragX);
	   		var dy = (y - this.startDragY);
	   		console.log("Rotate: " + dx+" "+dy);
	   		
	   		var sx =  dx / $(this.element).width();
	   		var sy =  dy / $(this.element).height();
	   		console.log("Rotate: " + sx+" "+sy);
	   		
	   		this.startDragX = x;
	   		this.startDragY = y;
	   		
	   		if((this.mouse_mode == "pan" && this.drag_button != 3)||(this.mouse_mode == "rotate" && this.drag_button == 3)) {
	   		  // panning
	   		
	   		  // Need to find 'up' and 'right' vectors to find how to shift look-at point.
	   		  var trans = Matrix.I(4);
	   		  trans = this.RotateX(trans,-this.theta);
	   		  trans = this.RotateY(trans,-this.phi);
	   		  var u = dx;
	   		  var v = dy;
	   		  var inv = Vector.create([u,v,0,1]);
	   		  var outv = trans.x(inv);
	   		  this.panMe(null,outv.e(1),outv.e(2),outv.e(3));
	   		  
	   		} else {
	   		  // rotating
	   		  sx = Math.asin(sx);
	   		  sy = -Math.asin(sy);
	   		  if(!ev.originalEvent.touches) {
	   		    sx=5*sx;
	   		    sy=5*sy;
	   		  }
	   		  console.log("Rotate: " + sx+" "+sy);
	   		  this.rotateMe(sy,sx);
	   		}
	   		this.Draw();
   	}else{
		var offset = getAbsolutePosition(this.canvas);
		var x = ev.pageX - offset.x;
		var y = ev.pageY - offset.y;    
		var u = this.width/2 -x;  // Translate and flip inverse to screen coords
		var v = this.height/2-y;
		this.FindTranslationalMatrix();
	    for(var i=0;i<this.charges.length;i++){
	    	var charge = this.charges[i];
			this.FindChargePosition(charge);
	        var du = u - charge.u;
	        var dv = v - charge.v;
	        var d = Math.sqrt(du*du+dv*dv);
	        if( d < charge.r*this.proj_dist/charge.tranz*1.5 || (this.draggingCharge == i)){
				this.draggingCharge = i;
				console.log(this.draggingCharge);
				this.SetXYCoords(charge,u,v);
				this.StartDraw();
	        }
	    }
   	}
}
EField3d.prototype.startDragging = function(ev){
  for(var i=0;i<this.objects.length;i++) if(this.objects[i].selected) this.chargeSelected = true;
  
  // this.startDragTransform = this.transform_matrix.dup();
  this.startDragX = ev.pageX;
  this.startDragY = ev.pageY;
  if(ev.originalEvent.touches) {
    if (ev.originalEvent.touches.length > 1) {this.dragging = false;return; } // don't allow multi-touch
    this.startDragX = ev.originalEvent.touches[0].pageX;
    this.startDragY = ev.originalEvent.touches[0].pageY;       
    this.startDragTouch = true;
    ev.originalEvent.preventDefault();       
  }	
  console.log("start drag "+this.startDragX+" "+this.startDragY);
  this.dragging = true;
  this.drag_button = ev.which;
  $(this.element).css("cursor","move !important");
  return true;
  
}
EField3d.prototype.stopDragging = function(ev){
  $(this.element).css("cursor","auto");
  this.draggingCharge = null;
  this.chargeSelected = false;
  this.dragging = false;
}