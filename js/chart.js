(function() {
    var pymChild = null;

    var margin = {left: 80, top: 10, right: 0, bottom: 40};

    // var selectedState;
    var opioidsData;

    var parseDate = d3.timeParse("%Y-%m-%d");
    var xScale = d3.scaleTime(),
        yScale = d3.scaleLinear(),
        colorScale = d3.scaleOrdinal(d3.schemeCategory10);

    // var PCTFORMAT = d3.format(".0%");
    // var COMMAFORMAT = d3.format(",");

    ///////////////////////// FUNCTIONS TO DO WITH DROPDOWN //////////////////////////
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

        // pymChild.onMessage("selectionChanged", updateChart);
    });

    function createChart(parentElement, state, temporal_unit, metric, width, height) {
        var data = getData(state, temporal_unit, metric);

        var keys = ['naltrexone_generic', 'naltrexone_brand', 'naloxone_generic', 'naloxone_brand', 'buprenorphine_generic', 'buprenorphine_brand'];
        // var keys = ['buprenorphine_generic', 'buprenorphine_brand'];

        stack.keys(keys);
        // console.log(stack(data));

        // set yScale domain based on data selected
        yScale.domain([0, d3.max(stack(data), function(d) { return d3.max(d, function(d) { return d[1]; }); })]).nice();

        var svg = d3.select("#" + parentElement)
            .append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        var layer = svg.selectAll(".area")
            .data(stack(data))
            .enter()
            .append("path")
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


    // update tool with selected state's information
    function updateChart(metric, state, timeUnit) {
        var data = getData(state, timeUnit, metric);

        var keys = ['naltrexone_generic', 'naltrexone_brand', 'naloxone_generic', 'naloxone_brand', 'buprenorphine_generic', 'buprenorphine_brand'];
        // var keys = ['naltrexone_generic', 'naltrexone_brand'];
        stack.keys(keys);

        // set yScale domain based on data selected
        yScale.domain([0, d3.max(stack(data), function(d) { return d3.max(d, function(d) { return d[1]; }); })]).nice();
        updateAxis();
        // console.log(stack(data));

        var layer = d3.select("#areaChart svg g").selectAll(".area")
            .data(stack(data), function(d) { return d.key; });

        layer.exit().remove();

        layer.enter()
            .append("path")
            .attr("class", "area")
            .style("fill", function(d) { return colorScale(d.key); })
            .merge(layer)
            .attr("d", area);
    }

    function updateAxis() {
        d3.select("#areaChart .axis.axis--y")
            .transition()
            .call(d3.axisLeft(yScale));
    }
    //////////////////////////////////////////////////////////////////////////

    //////////////////////// GET USER SELECTIONS /////////////////////////////
    d3.selectAll("input[name='perCapita']").on("change", getSelections);
    d3.selectAll("input[name='metric']").on("change", getSelections);
    d3.selectAll("input[name='drug']").on("change", getSelections);
    d3.select("#stateDropdown").on("change", getSelections);
    d3.selectAll("input[name='timeUnit']").on("change", getSelections);

    function getSelections() {
        var perCapita = getPerCapita();
        var metric = getMetric();
        var drugs = getDrug();
        var geo = getGeography();
        var timeUnit = getTimeUnit();

        // build array of keys
        var keys = [];
        if(perCapita) {
            keys = drugs.map(function(drug) { return drug + "_percap"; });
            // if per capita is checked, need to uncheck the generic/brand checkboxes
            // console.log(keys);
        }
        //console.log(perCapita);
        updateChart(metric, geo, timeUnit);
    }

    function getDrug() {
        var selectedDrugs = [];

        var checked = d3.selectAll("input[name='drug']:checked").nodes();
        // console.log(checked);

        // all drugs selected -> deselect one drug -> "all drugs" box should be unchecked
        if(d3.select("#all").property("checked") && checked.length < 4) {
            uncheckBox("#all");
        }
        // "all drugs" deselected -> "all drugs" selected -> all individual drugs should be selected
        // "all drugs" selected -> "all drugs" deselected -> all individual drugs should be deselected



        for(var i = 0; i < checked.length; i++) {
            if(checked[i].value === "all") {
                checkAllDrugBoxes();
                selectedDrugs = ["buprenorphine", "naltrexone", "naloxone"];
                break;
            }
            else {
                selectedDrugs.push(checked[i].value);
            }
        };
        return selectedDrugs;
    }

    function getPerCapita() {
        return d3.select("#perCapita").property("checked");
    }

    function getMetric() {
        return d3.selectAll("input[name='metric']:checked").property("value");
    }

    function getGeography() {
        return d3.select("#stateDropdown").property("value");
    }

    function getTimeUnit() {
        return d3.selectAll("input[name='timeUnit']:checked").property("value");
    }

    /////////////////////// checkbox functions //////////////////////////
    function checkAllDrugBoxes() {
        checkBox("#buprenorphine");
        checkBox("#naltrexone");
        checkBox("#naloxone");
    }

    function uncheckAllDrugBoxes() {
        uncheckBox("#buprenorphine");
        uncheckBox("#naltrexone");
        uncheckBox("#naloxone");
    }

    function checkBox(id) {
        d3.select(id).property("checked", true);
    }

    function uncheckBox(id) {
        d3.select(id).property("checked", false);
    }
})();