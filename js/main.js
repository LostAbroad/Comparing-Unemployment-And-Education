//Creates extent
var extant = [];

//Sets width and height
var width = 960,
    height = 500;

function popup_function() {
  var popup = document.getElementById("Details_Popup");
  popup.classList.toggle("show");
}

//Determines Id labels for d3
var graduateById = d3.map(),
    someCollegeById= d3.map(),
    highschoolById= d3.map(),
    noHighschoolById= d3.map(),
    unemploymentById = d3.map(),
    nameById = d3.map();

//Sets up scale and range for map/color
var quantize = d3.scale.quantize()
    .domain([0, 0.22])
    .range(d3.range(9).map(function(i) { return "q" + i + "-9"; }));

//Creates path
var path = d3.geo.path();

//Selects map and creates appropriate height/width
var svg = d3.select("#map")
    .append("svg")
    .attr("width", width)
    .attr("height", height)
;

//Creates tip tool which selects information from csv to display
tip = d3.tip()
  .attr('class', 'd3-tip')
  .offset([-10, 0])
  .direction('n')
  .html(function(d) {
    return nameById.get(d.id) + "<br/>Percent College Education: " + (graduateById.get(d.id)*100).toFixed(2) + "%" +
        "<br/>Percent Some College Education: " + (someCollegeById.get(d.id)*100).toFixed(2) + "%" +
        "<br/>Percent Highschool Graduate: " + (highschoolById.get(d.id)*100).toFixed(2) + "%" +
        "<br/>Percent Not Highschool Graduate: " + (noHighschoolById.get(d.id)*100).toFixed(2) + "%" +
        "<br/>Unemployment Rate: " + (unemploymentById.get(d.id)*100).toFixed(2) + "%";
 });

//Calls tip tool
svg.call(tip);

//Creates map legend
var legend = d3.select("#map-legend").
  append("svg:svg").
  attr("width", 160).
  attr("height", 10);

//Parameters for legend
for (var i = 0; i <= 7; i++) {
  legend.append("svg:rect").
  attr("x", i*20).
  attr("height", 10).
  attr("width", 20).
  attr("class", "q" + i + "-9 ");//color
}

//Creates filters to be used
var nation = crossfilter(),
  all = nation.groupAll(),
    college_graduate = nation.dimension(function(d) { return d.College_Graduated_2017; }), 
    college_graduates = college_graduate.group(),
    
    Some_College_Graduated_2017 = nation.dimension(function(d) { return d.Some_College_Graduated_2017; }), 
    Some_College_Graduated_2017s = Some_College_Graduated_2017.group(),
    
    Highschool_Graduated_2017 = nation.dimension(function(d) { return d.Highschool_Graduated_2017; }), 
    Highschool_Graduated_2017s = Some_College_Graduated_2017.group(),
    
    Not_Highschool_Graduated_2017 = nation.dimension(function(d) { return d.Not_Highschool_Graduated_2017; }), 
    Not_Highschool_Graduated_2017s = Some_College_Graduated_2017.group(),
    
    Unemployment_rate_2017 = nation.dimension(function(d) { return d.Unemployment_rate_2017; }),
    Unemployment_rate_2017s = Unemployment_rate_2017.group();

//Determines which data is to be used
queue()
    .defer(d3.json, "data/counties.json")
    .defer(d3.tsv, "data/2017_College_Income_Unemployment.tsv", function(d) {

      for(var propertyName in d) {
        if (propertyName == "Area") {
          continue;
        }
        d[propertyName] = +d[propertyName];
      }

      nation.add([d]);
      extant.push(d.id);

      graduateById.set(d.id, d.College_Graduated_2017);
      someCollegeById.set(d.id, d.Some_College_Graduated_2017);
      highschoolById.set(d.id, d.Highschool_Graduated_2017);
      noHighschoolById.set(d.id, d.Not_Highschool_Graduated_2017);
      unemploymentById.set(d.id, d.Unemployment_rate_2017);
      nameById.set(d.id, d.Area);
    })
    .await(ready);

//Appends data to ID and creates mouseover/mouseout
function ready(error, us) {
  svg.append("g")
      .attr("class", "counties")
    .selectAll("path")
      .data(topojson.feature(us, us.objects.counties).features)
    .enter().append("path")
      .attr("class", function(d) { return quantize(unemploymentById.get(d.id)); })
      .attr("id", function(d) { return d.id; })
      .attr("d", path)
      .on('mouseover',tip.show)
      .on('mouseout', tip.hide);

//Sets up charts domain and ranges
  var charts = [
      
    barChart(true)
      .dimension(Unemployment_rate_2017)
      .group(Unemployment_rate_2017s)
    .x(d3.scale.linear()
      .domain([0.013, 0.22])
      .range([0, 490])),

    barChart(true)
      .dimension(college_graduate)
      .group(college_graduates)
    .x(d3.scale.linear()
      .domain([0.045, 0.79])
      .range([0, 490])),
      
      barChart(true)
      .dimension(Some_College_Graduated_2017)
      .group(Some_College_Graduated_2017s)
    .x(d3.scale.linear()
      .domain([0.085, 0.47])
      .range([0, 490])),
      
      barChart(true)
      .dimension(Highschool_Graduated_2017)
      .group(Highschool_Graduated_2017s)
    .x(d3.scale.linear()
      .domain([0.07, 0.55])
      .range([0, 490])),
      
       barChart(true)
      .dimension(Not_Highschool_Graduated_2017)
      .group(Not_Highschool_Graduated_2017s)
    .x(d3.scale.linear()
      .domain([0.013, 0.59])
      .range([0, 490]))

  ];

//Allows for charts to render
  var chart = d3.selectAll(".chart")
    .data(charts)
    .each(function(chart) { chart.on("brush", renderAll).on("brushend", renderAll); });

  renderAll();

//Creates bar chart area
  function barChart(percent) {
    if (!barChart.id) barChart.id = 0;

    percent = typeof percent !== 'undefined' ? percent : false;
    var formatAsPercentage = d3.format(".0%");
    
    var axis = d3.svg.axis().orient("bottom");
    if (percent == true) {
      axis.tickFormat(formatAsPercentage);
      
    }
//Determines size and range
    var margin = {top: 10, right: 10, bottom: 30, left: 10},
      x,
      y = d3.scale.linear().range([50, 0]),
      id = barChart.id++,
      brush = d3.svg.brush(),
      brushDirty,
      dimension,
      group,
      round;

    function chart(div) {
      var width = x.range()[1],
          height = y.range()[0];

      try {
        y.domain([0, group.top(1)[0].value]);
      }
      catch(err) {
        window.reset;
      } 

      div.each(function() {
        var div = d3.select(this),
            g = div.select("g");

// Create the skeletal chart
        if (g.empty()) {
          div.select(".title").append("a")
              .attr("href", "javascript:reset(" + id + ")")
              .attr("class", "reset")
              .text("reset")
              .style("display", "none");

          g = div.append("svg")
              .attr("width", width + margin.left + margin.right)
              .attr("height", height + margin.top + margin.bottom)
            .append("g")
              .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

          g.append("clipPath")
              .attr("id", "clip-" + id)
            .append("rect")
              .attr("width", width)
              .attr("height", height);

          g.selectAll(".bar")
              .data(["background", "foreground"])
            .enter().append("path")
              .attr("class", function(d) { return d + " bar"; })
              .datum(group.all());

          g.selectAll(".foreground.bar")
              .attr("clip-path", "url(#clip-" + id + ")");

          g.append("g")
              .attr("class", "axis")
              .attr("transform", "translate(0," + height + ")")
              .call(axis);

// Initialize the brush component with pretty resize handles.
          var gBrush = g.append("g").attr("class", "brush").call(brush);
          gBrush.selectAll("rect").attr("height", height);
          gBrush.selectAll(".resize").append("path").attr("d", resizePath);
        }

// Only redraw the brush if set externally.
        if (brushDirty) {
          brushDirty = false;
          g.selectAll(".brush").call(brush);
          div.select(".title a").style("display", brush.empty() ? "none" : null);
          if (brush.empty()) {
            g.selectAll("#clip-" + id + " rect")
                .attr("x", 0)
                .attr("width", width);
          } else {
            var extent = brush.extent();
            g.selectAll("#clip-" + id + " rect")
                .attr("x", x(extent[0]))
                .attr("width", x(extent[1]) - x(extent[0]));
          }
        }

        g.selectAll(".bar").attr("d", barPath);
      });

      function barPath(groups) {
        var path = [],
            i = -1,
            n = groups.length,
            d;
        while (++i < n) {
          d = groups[i];
          path.push("M", x(d.key), ",", height, "V", y(d.value), "h9V", height);
        }
        return path.join("");
      }

      function resizePath(d) {
        var e = +(d == "e"),
            x = e ? 1 : -1,
            y = height / 3;
        return "M" + (0.5 * x) + "," + y
            + "A6,6 0 0 " + e + " " + (6.5 * x) + "," + (y + 6)
            + "V" + (2 * y - 6)
            + "A6,6 0 0 " + e + " " + (0.5 * x) + "," + (2 * y)
            + "Z"
            + "M" + (2.5 * x) + "," + (y + 8)
            + "V" + (2 * y - 8)
            + "M" + (4.5 * x) + "," + (y + 8)
            + "V" + (2 * y - 8);
      }
    }

    brush.on("brushstart.chart", function() {
      var div = d3.select(this.parentNode.parentNode.parentNode);
      div.select(".title a").style("display", null);
    });

    brush.on("brush.chart", function() {
      var g = d3.select(this.parentNode),
          extent = brush.extent();
      if (round) g.select(".brush")
          .call(brush.extent(extent = extent.map(round)))
        .selectAll(".resize")
          .style("display", null);
      g.select("#clip-" + id + " rect")
          .attr("x", x(extent[0]))
          .attr("width", x(extent[1]) - x(extent[0]));

      var selected = [];

      dimension.filterRange(extent).top(Infinity).forEach(function(d) {
        selected.push(d.id);
      });
      svg.attr("class", "counties")
        .selectAll("path")
          .attr("class", function(d) { if (selected.indexOf(d.id) >= 0) {return "q8-9";} else if (extant.indexOf(d.id) >= 0) {return "q5-9";} else {return null;}});

    });

    brush.on("brushend.chart", function() {
      if (brush.empty()) {
        var div = d3.select(this.parentNode.parentNode.parentNode);
        div.select(".title a").style("display", "none");
        div.select("#clip-" + id + " rect").attr("x", null).attr("width", "100%");
        dimension.filterAll();
      }
    });

    chart.margin = function(_) {
      if (!arguments.length) return margin;
      margin = _;
      return chart;
    };

    chart.x = function(_) {
      if (!arguments.length) return x;
      x = _;
      axis.scale(x);
      brush.x(x);
      return chart;
    };

    chart.y = function(_) {
      if (!arguments.length) return y;
      y = _;
      return chart;
    };

    chart.dimension = function(_) {
      if (!arguments.length) return dimension;
      dimension = _;
      return chart;
    };

    chart.filter = function(_) {
      if (_) {
        brush.extent(_);
        dimension.filterRange(_);
      } else {
        brush.clear();
        dimension.filterAll();
      }
      brushDirty = true;
      return chart;
    };

    chart.group = function(_) {
      if (!arguments.length) return group;
      group = _;
      return chart;
    };

    chart.round = function(_) {
      if (!arguments.length) return round;
      round = _;
      return chart;
    };

    return d3.rebind(chart, brush, "on");
  }

// Renders the specified chart or list.
  function render(method) {
    d3.select(this).call(method);
  }

// Whenever the brush moves, re-rendering everything.
  function renderAll() {
    chart.each(render);
  }

  window.filter = function(filters) {
    filters.forEach(function(d, i) { charts[i].filter(d); });
    renderAll();
  };

//Resets the window
  window.reset = function(i) {
    charts.forEach(function (c) {
      c.filter(null);
    });
    renderAll();
    svg.attr("class", "counties")
      .selectAll("path")
        .attr("class", function(d) {return quantize(unemploymentById.get(d.id)); });
  };

}