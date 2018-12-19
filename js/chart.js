(function() {
    var pymChild = null;

    var margin = {left: 70, top: 10, right: 0, bottom: 40};

    // var selectedState;
    var opioidsData;

    var parseDate = d3.timeParse("%Y-%m-%d");
    var xScale = d3.scaleTime(),
        yScale = d3.scaleLinear(),
        colorScale = d3.scaleOrdinal(d3.schemeCategory10);

    // var PCTFORMAT = d3.format(".0%");
    // var COMMAFORMAT = d3.format(",");

    ///////////////////////// FUNCTIONS TO DO WITH DROPDOWN //////////////////////////
    // var states = ["National",
    //                 "──────────",
    //                 "Alabama",
    //                 "Alaska",
    //                 "Arizona",
    //                 "Arkansas",
    //                 "California",
    //                 "Colorado",
    //                 "Connecticut",
    //                 "Delaware",
    //                 "District of Columbia",
    //                 "Florida",
    //                 "Georgia",
    //                 "Hawaii",
    //                 "Idaho",
    //                 "Illinois",
    //                 "Indiana",
    //                 "Iowa",
    //                 "Kansas",
    //                 "Kentucky",
    //                 "Louisiana",
    //                 "Maine",
    //                 "Maryland",
    //                 "Massachusetts",
    //                 "Michigan",
    //                 "Minnesota",
    //                 "Mississippi",
    //                 "Missouri",
    //                 "Montana",
    //                 "Nebraska",
    //                 "Nevada",
    //                 "New Hampshire",
    //                 "New Jersey",
    //                 "New Mexico",
    //                 "New York",
    //                 "North Carolina",
    //                 "North Dakota",
    //                 "Ohio",
    //                 "Oklahoma",
    //                 "Oregon",
    //                 "Pennsylvania",
    //                 "Rhode Island",
    //                 "South Carolina",
    //                 "South Dakota",
    //                 "Tennessee",
    //                 "Texas",
    //                 "Utah",
    //                 "Vermont",
    //                 "Virginia",
    //                 "Washington",
    //                 "West Virginia",
    //                 "Wisconsin",
    //                 "Wyoming"];

    // makeStateDropdown();

    // // populate dropdown with selection options for all states + DC + national
    // function makeStateDropdown(stateArray) {
    //     d3.select("#stateDropdown")
    //         .selectAll("option")
    //         .data(states)
    //         .enter()
    //         .append("option")
    //         .attr("value", function(d) { return d; } )
    //         .text(function(d) { return d; });

    //     // disable the second option (i.e., the separator) because it's merely decorative
    //     d3.select("#stateDropdown option:nth-child(2)")
    //         .property("disabled", true);
    // }

    // // Turn dropdown into jQuery UI selectmenu
    // $( function() {
    //     $( "#stateDropdown" ).selectmenu({
    //         change: function( event, data ) {
    //             pymChild.sendMessage("selectState", data.item.value);
    //         },
    //         open: function(event, data) {
    //         //     d3.select("#mapMask")
    //         //         .attr("width", function(d){ return d[0]})
    //         //         .attr("height", function(d){ return d[1] })

    //             // var menuHeight = d3.select(".stateSelection").node().getBoundingClientRect().height;
    //             d3.select("#stateDropdown-menu").style("height", "400px");
    //         }
    //         // close: function(event, data){
    //         //     d3.select("#mapMask")
    //         //         .transition()
    //         //         .duration(0)
    //         //         .delay(200)
    //         //         .attr("width",0).attr("height",0)
    //         // }
    //     });
    // });

    //////////////////////////////////////////////////////////////////////////////////



    ///////////////////////// FUNCTIONS TO DO WITH PIES //////////////////////////////

    var stack = d3.stack();

    var area = d3.area()
        .x(function(d, i) { return xScale(d.data.date); })
        .y0(function(d) { return yScale(d[0]); })
        .y1(function(d) { return yScale(d[1]); });

    // var clickEvent = isIE() ? "mouseup" : "click";

    function drawGraphic(containerWidth) {
        // set up chart dimensions
        if (containerWidth == undefined || isNaN(containerWidth) || containerWidth > 688) {
            containerWidth = 688;
        }

        // var width = Math.min(containerWidth, 200 - margin["left"] - margin["right"]),
        var width = containerWidth - margin["left"] - margin["right"],
            height = width * 0.75 - margin["top"] - margin["bottom"];

        // clear chart divs before redrawing maps
        $(".chart").empty();

        // set up scales based on iframe width and height
        xScale.domain(d3.extent(opioidsData, function(d) { return d.date; })).range([0, width]);
        yScale.rangeRound([height, 0]);

        // initial view loads National data
        createChart("areaChart", "National", "quarterly", "adjmedamt", width, height);

        // This is calling an updated height.
        if (pymChild) {
            pymChild.sendHeight();
        }
    }

    // parse data and draw plots
    d3.csv("data/opioids_data.csv", function(d) {
            return {
                state: d.state,
                temporal_unit: d.temporal_unit,
                date: parseDate(d.date),
                metric: d.metric,
                all_percap: +d.all_percap,
                all_total: +d.all_total,
                buprenorphine_percap: +d.buprenorphine_percap,
                buprenorphine_total: +d.buprenorphine_percap,
                naloxone_percap: +d.naloxone_percap,
                naloxone_total: +d.naloxone_total,
                naltrexone_percap: +d.naltrexone_percap,
                naltrexone_total: +d.naltrexone_total,
                all_brand: +d.all_brand,
                all_generic: +d.all_generic,
                buprenorphine_brand: +d.buprenorphine_brand,
                buprenorphine_generic: +d.buprenorphine_generic,
                naloxone_brand: +d.naloxone_brand,
                naloxone_generic: +d.naloxone_generic,
                naltrexone_brand: +d.naltrexone_brand,
                naltrexone_generic: +d.naltrexone_generic
        };
    }, function(error, data) {
        if (error) throw error;

        opioidsData = data;
        // console.log(opioidsData);

        colorScale.domain(data.columns.slice(4));

        pymChild = new pym.Child({renderCallback: drawGraphic });

        // pymChild.onMessage("stateSelected", updatePies);
    });

    function createChart(parentElement, state, temporal_unit, metric, width, height) {
        var data = getData(state, temporal_unit, metric);

        var keys = ['naltrexone_generic', 'naltrexone_brand', 'naloxone_generic', 'naloxone_brand', 'buprenorphine_generic', 'buprenorphine_brand'];

        stack.keys(keys);
        // console.log(stack(data));

        // set yScale domain based on data selected
        yScale.domain([0, d3.max(stack(data), function(d) { return d3.max(d, function(d) { return d[1]; }); })]);

        var svg = d3.select("#" + parentElement)
            .append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        var layer = svg.selectAll(".layer")
            .data(stack(data))
            .enter()
            .append("g")
            .attr("class", "layer");

        layer.append("path")
            .attr("class", "area")
            .style("fill", function(d) { return colorScale(d.key); })
            .attr("d", area);

        svg.append("g")
            .attr("class", "axis axis--x")
            .attr("transform", "translate(0," + height + ")")
            .call(d3.axisBottom(xScale));

        svg.append("g")
            .attr("class", "axis axis--y")
            .call(d3.axisLeft(yScale));
    }

    function getData(state, temporal_unit, metric) {
        return opioidsData.filter(function(d) { return d.state === state && d.temporal_unit === temporal_unit && d.metric === metric; });
    }

/*
    // update tool with selected state's information
    function updatePies(state) {

        updatePie(state, "#pctServedPie", "pct_served_center");
        updatePie(state, "#priorityGroupPie", "pct_onegrp");
        updatePie(state, "#someNonStdPie", "pct_nonstd_some");
        updatePie(state, "#majorityNonStdPie", "pct_nonstd_maj");
        updatePie(state, "#infantsPie", "pct_infants");
        updatePie(state, "#nonMetroPie", "pct_nonmetro");

        populateText(state);
    }

    function updatePie(state, chartId, newVar) {
        var newData = makePieData(state, newVar);

        d3.select(chartId)
            .selectAll("path")
            .data(pie(newData), function(d) { return d.data.label; })
            .transition()
            .duration(1000)
            .attrTween("d", arcTween);

        d3.select(chartId + " .totalPct")
            .text(PCTFORMAT(newData[0]["val"]));
    }
*/
    //////////////////////////////////////////////////////////////////////////
})();