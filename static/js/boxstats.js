
var DF = "MMM-dd-yy hh:mm";
var URL = "/data2";


function Boxstats(id, canvas, init_cnt, ww, w_height, update_header, zoom_box, slider_max) {
    this.id = id;

    this.vix = [];
    this.zoom_box = zoom_box;

    var dateFormat = pv.Format.date("%b-%d");
    var dateFormat2 = pv.Format.date("%b-%d %H:%M");
    var dateFormat3 = pv.Format.date("%b-%d-%y %H:%M");
    this.vis = null;
    this.parent_graph = null;
    this.x = null;
    this.y = null;
    this.slider_max = slider_max;
    this.box_w = 0;
    this.box_count = 100;
    this.current_i = -1;
    this.point_count = 100;
    this.h = w_height || 400;
    this.kx = ww / this.h;
    this.ky = 1;
    this.save_scale = 0;
    this.date_range = '';
    this.selected = {stime:0, etime:0}
    this.show_circles = 300;
    this.stack = [];
    this.slide_value = 0;
    this.hoverLabel = "";
    this.hover = {stime : 0, etime : 0, value: ''};
    this.box_w = 4;
    var offset = 20;


    var that = this;

    this.scale_xy = function () {

        this.x = pv.Scale.linear(this.vix, function (d) {
            return d.smiddle
        }).range(0, ww);


        this.y = pv.Scale.linear(this.vix,
            function (d) {
                return d.min - 5
            },
            function (d) {
                return d.max
            }).range(0, this.h).nice();


        function withinDays(d) {
            var ts = that.date_range.split(",");
            var st1 = parseInt(ts[0]);
            var st2 = parseInt(ts[1]);
            //console.log('DIFF' + (st2-st1))
            return (st2-st1) < 60 * 60 * 24 * d * 1000; //
        }
        /* Dates. */
        this.vis.add(pv.Rule)
            .data(this.x.ticks(5))
            .left(this.x)
            .strokeStyle("#E0E0E0")
            .anchor("bottom").add(pv.Label)
            .text(function (r) {
                return withinDays(4) ? dateFormat2(r) : dateFormat(r)
            });

        /* Y Coordinates */
        this.vis.add(pv.Rule)
            .data(this.y.ticks(10))
            .bottom(this.y)
            .left(-10)
            .right(-10)
            .strokeStyle("#E0E0E0")
            .anchor("left").add(pv.Label)
            .textStyle(function (d) {
                return d % 10 ? "#999" : "#333"
            })
            .text(this.y.tickFormat);

    }


    this.getData = function (scale) {
        var detail_level = scale == this.slider_max ? "ALL" : scale;
        var data1 = $.ajax({
            type: "GET",
            url: URL + "?detail=" + detail_level + "&date_range=" + this.date_range,
            async: false}).responseText;

        this.message = JSON.parse(data1);
        this.point_count = this.message.point_count
        this.box_count = this.message.box_count

        if (update_header)
            update_header(this.message);

        this.vix = this.message.data;
        this.vix.forEach(function (d) {
            d.stime0 = d.stime;
            d.smiddle = new Date((d.stime + d.etime) / 2);

            d.etime2 = new Date(d.etime);
            return d.stime = new Date(d.stime); // dateFormat.parse(d[0])
        });

    }


    function drilldown(text){
        var s = text;
        var ix = s.indexOf(">");
        if (ix >= 0) {
            var ts = s.substring(3, ix).split(",");
            if (ts[0] == ts[1]) return;

            if (!that.zoom_box) {
                that.stack.push({date_range: that.date_range,
                    scale: that.save_scale,
                    slide_value: that.slide_value})
                that.date_range = s.substring(3, ix);
                console.log('date_range=' + that.date_range);

                $("#slider-range-min").slider("value", init_cnt);

                that.graph(20);
            } else {

                that.selected.stime = parseInt(ts[0]);
                that.selected.etime = parseInt(ts[1]);
                console.log('selected.stime=' + that.selected.stime + ", etime=" +
                    that.selected.etime + ", half=" +
                    (that.selected.etime - that.selected.stime)/2);
                that.vis.render();
                var rg = s.substring(3, ix);
                that.zoom_box.date_range = rg;
                that.zoom_box.stack = [];
                that.zoom_box.graph(init_cnt);

            }
        }
    }

    this.crosshair0 = function() {

        // HOVER HIGHLIGHT PANEL
        this.vis.add(pv.Panel)
            .data(function() { return [2] } )
            .fillStyle("#F0F0FF")
            .width(function(d) { console.log("HOVER" + that.hover.stime);
                if (that.hover.stime) {
                    var w = that.box_w * 2;
                    return w < 6 ? 6 : w+2;
                } else {
                    return 0;
                }
            })
            .left(function (d) {
                if (that.hover.stime) {
                    var mid = that.x((that.hover.stime + that.hover.etime) / 2);
                    return mid - that.box_w ;
                } else {
                    return 0;
                }
            })
            .antialias(false);
    }

    this.crosshair = function() {

          // HOVER HIGHLIGHT CROSSHAIR: vertical
          
          this.vis.add(pv.Bar)
            .data(function() { return [2] } )
            .fillStyle("red")
            .width(function (d) { return that.hover.stime ? 1:0 })
            .height(function(d) {
                 return that.y(that.hover.value)
            })
            .bottom(0)
            .left(function (d) {
                if (that.hover.stime) {
                    return 1+ that.x((that.hover.stime + that.hover.etime) / 2);
                } else {
                    return 0;
                }
            })
            .antialias(false);

          // HOVER HIGHLIGHT PANEL CROSSHAIR: horizontal
          this.vis.add(pv.Bar)
            .data(function() { return [2] } )
            .fillStyle("red")
            .left(-10)
            .width(function(d) {
                return 10 + that.x((that.hover.stime + that.hover.etime) / 2);
            })
            .bottom(function(d) {
                if (that.hover.stime) {
                    return that.y(that.hover.value)
                } else {
                    return 0;
                }
                
            })
            .height(function (d) { return that.hover.stime ? 1:0 })
            .antialias(false);
     }



    // scale : #boxes to show

    this.graph = function (scale) {

        this.selected = {};
        $('.tipsy:last').remove();

        this.vis = new pv.Panel()
            .width(ww + offset )
            .height(this.h)
            .margin(20)
            .left(offset+offset).canvas(canvas);

        this.getData(scale); // can change the scale if scale=0
        this.save_scale = scale;


        this.box_w = Math.round(ww / this.box_count / 4);
        if (this.box_w > 15) this.box_w = 15;
        //console.log("w=" + ww + ", box_count=" + this.box_count + ", scale=" + scale)
        //console.log("box_w=" + this.box_w)

        //console.log('scale=' + scale)


        // LABEL

        this.vis.add(pv.Label)
            .left(function() {
                var x = that.x((that.hover.stime+that.hover.etime)/2);
                var inc = Math.abs(ww - x) < 200 ? that.box_w : - that.box_w;
                return that.x((that.hover.stime+that.hover.etime)/2) +inc;
            })
            .top(-3)
            .textAlign(function() {
                var x = that.x((that.hover.stime+that.hover.etime)/2);
                return Math.abs(ww - x) < 200 ? "right" : "left";

            })
            .text(function() {
                var x = that.x((that.hover.stime+that.hover.etime)/2);

                if (that.hover.stime) {
                    var d1 = dateFormat3(new Date(that.hover.stime));
                    var d2 = dateFormat3(new Date(that.hover.etime));
                    var date_s = that.hover.stime == that.hover.etime ?
                        d1 :   d1 + " / " + d2 ;

                    return Math.abs(ww - x) > 200  ?
                           that.hover.value + "  (" +  date_s + ")" :
                          "(" + date_s + ") " +  that.hover.value ;

                }
            })



        // CLICK HIGHLIGHT BAR
        this.vis.add(pv.Panel)
            .data(function() { return [that.selected] } )
            .width(function() {

                var w = that.x(that.selected.etime) - that.x(that.selected.stime);
                return w < 2  ? 2 : w;
            })
            .fillStyle("#F0F0E0")
            .bottom(0)
            .left(function (d) {
                //console.log('re-render highlighted box ' + that.id + "," + that.selected.stime);
                return that.x(that.selected.stime)
            })
        this.crosshair0();

        this.scale_xy();

        this.crosshair();

        var this_x = this.x;
        var this_y = this.y;

        // Draw a curved line following the  averages
        if (scale < slider_max || this.point_count <= this.show_circles) {

            this.vis.add(pv.Line)
                .data(this.vix)
                .interpolate("cardinal")
                .strokeStyle("#FFC0C0")
                .left(function (d) {
                    return  this_x(d.smiddle)
                })
                .bottom(function (d) {
                    return this_y(d.avg)
                })
                .lineWidth(2);

        }
        // Draw the dots



        function hoverBar(s, that) {
            var ix = s.indexOf(">");
            if (ix > 0) {
                var ts = s.substring(3, ix).split(",");

                that.hover.stime =  parseInt(ts[0]);
                that.hover.etime =  parseInt(ts[1]);
                that.hover.value = ts[2];
                that.vis.render();
            }
        }

        // CREATE INVISIBLE PANELS FOR EACH BOX

        this.points = this.vis.add(pv.Panel)
            .data(this.vix)
            .left(function (d) {
                return that.x(d.smiddle) - that.box_w + 2
            })
            .fillStyle("x")
            .event("mouseover",function() {
                //console.log("OVER");
            })
            .text(function (d) {
                return "<x " + d.stime0 + "," + d.etime + "," + d.avg + "><b>"
            })
            .event("mouseover",function() {
                if (that.parent_graph) {
                  that.parent_graph.hover.stime = 0;
                  that.parent_graph.vis.render();
                }
                hoverBar(this.text(), that)

            })
            .event("click", function() {
                //console.log("CALLING DRILLDOWN");
                drilldown(this.text())
            })
            .width(
                 this.box_w * 2
            );


        // CREATE DOTS
        if (scale == slider_max || this.message.group_size == 1) {

            this.vis.add(pv.Dot)
                .data(this.vix).
                size(function() {
                   if (that.point_count < that.show_circles) {
                      var s = Math.round(ww / that.point_count);
                      return s > 30 ? 30 : s;  // max_dot_size=30
                   } else {
                      return 1;
                   }
                })
                .left(function (d) {
                    return this_x(d.smiddle)
                })
                .fillStyle("white")
                .bottom(function (d) {
                    return this_y(d.med)
                })
                .text(function (d) {
                    return "<x " + d.stime0 + "," + d.etime + "," + d.avg + "><b>" +
                        d.stime.formatDate(DF) +  "</b><br>Value: " + d.avg
                })
                .event("xmouseover", pv.Behavior.tipsy(
                    {gravity: "nw", html: true, opacity: 0.97, fade: false}
                ))
        }

        // CREATE BOXES
        if (scale < this.slider_max && this.message.group_size > 1) {

            // vertical line between min and max, in the middle of box
            this.points.add(pv.Rule)
                .left(this.box_w)
                .bottom(function (d) {
                    return this_y(d.min)
                })
                .height(function (d) {
                    return this_y(d.max) - this_y(d.min)
                });

            /* Add the min and max indicators */
            this.points.add(pv.Rule).
                data(function (d) {
                    return [d.min, d.max]
                })
                .bottom(this.y)
                .left(this.box_w / 2 - 1)
                .width(this.box_w + 1);

            /* Add the upper/lower quartile ranges */
            this.points.add(pv.Bar)
                .bottom(function (d) {
                    return this_y(d.low)
                })
                .height(function (d) {
                    var h = Math.abs(this_y(d.high) - this_y(d.low))
                    return h < 2 ? 2:h
                })
                .fillStyle(function (d) {
                     return "#aec7e8";

                })
                .strokeStyle("black")
                .lineWidth(1)
                .text(function (d) {

                    return "<x " + d.stime0 + "," + d.etime + "," + d.avg + "><b>" +
                        d.stime.formatDate(DF)
                        + "<br>" +
                        d.etime2.formatDate(DF) + "</b>"
                        +"<table border=0 cellspacing=0><tr><td align=right>Cnt:</td><td>" + d.size
                        +"</td><tr><td align=right>Min: </td><td>" + d.min 
                        +"</td><tr><td align=right>Max: </td><td>" + d.max
                        +"</td><tr><td align=right>Low: </td><td>" + d.low 
                        +"</td><tr><td align=right>High: </td><td>" + d.high
                        +"</td><tr><td align=right>Avg: </td><td> " + d.avg


                        "</table>"

                })

                .event("mouseover", pv.Behavior.tipsy(
                    {gravity: "nw",  html: true, opacity: 0.95, fade: false}
                    ,
                    function() {     // ONCLICK
                        drilldown(this.attributes[0].nodeValue)
                    },
                    function(tip) {  // ONMOUSEOVER
                        var s = tip[0].attributes[0].nodeValue;
                        var ix = s.indexOf(">");
                        if (ix >= 0) {
                            var ts = s.substring(3, ix).split(",");
                            that.hover.stime = parseInt(ts[0]);
                            that.hover.etime = parseInt(ts[1]);
                            that.hover.value = ts[2];
                            that.vis.render();

                        }
                    }
                ))

                .antialias(false);

            /* Add the median line */
            this.points.add(pv.Rule)
                .bottom(function (d) {
                    return that.y(d.med)
                })
                .lineWidth(1);
            /* add average */
            this.points.add(pv.Rule)
                .bottom(function (d) {
                    return that.y(d.avg)
                })
                .height(2)
                .lineWidth(1).strokeStyle("red");

        }

        this.vis.render();
    }
}
