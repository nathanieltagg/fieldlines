Field Line Applet
====================

Applet by Nathaniel Tagg, Physics Department, Otterbein University

This is a small web page that creates maps of electric field lines using Javascript in HTML5, intended for educational use.

Feel free to link directly to the live version at http://nathanieltagg.github.io/fieldlines

You are free to use this in your own projects, but please let me know and give me credit if you do so.

About the simulation:
---------------------
Interestingly, drawing field lines is not closed-form soluable. This applet works by a 'shooting' approximation.

The first charge is generated with a set of field lines coming out with equal spacing. This lines are then traced 
along the direction of the field until the line either connects to another charge or gets very far out of the simulation
box.   

However, this creates connecting lines to some of the other charges, using up some of the 'nodes' that should
be radiating from that charge.  The simulation attempts to fast and dirty work to try to even out the remaining
lines.  Generally speaking, however, it is NOT possible to have lines radiating outward at equal angles from all charges
when the charges have finite size.

This simulation could probably be improved by iterating on the field lines, and backtracking foward and back between
charges to try to even out the spacing, but this would make the simulation non-responsive.  
Source code is available for forking at <a href="https://github.com/nathanieltagg/fieldlines">https://github.com/nathanieltagg/fieldlines</a>

Other work:
----------
See also a 3D version of this work: <a href='https://github.com/Awesomeology/EField3d'>https://github.com/Awesomeology/EField3d</a>

Nathaniel Tagg, Dec 2014


