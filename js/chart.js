(function() {
    var pymChild = null;

    var margin = {left: 35, top: 30, right: 10, bottom: 18};

    // modify d3's SI units to replace the "G" with "B" for billions in tick labels
    var BILLIONS = function(val){
        var b = d3.format(".2s")(val);
        return(b.replace(/G/,"B"));
    }

    // var selectedState;
    var opioidsData;
    var minDate;
    var originalHeight;

    var parseDate = d3.timeParse("%Y-%m-%d");
    var xScale = d3.scaleTime(),
        yScale = d3.scaleLinear();
        // colorScale = d3.scaleOrdinal()
        //     .domain(["buprenorphine", "buprenorphine_brand", "buprenorphine_generic",
        //         "naloxone", "naloxone_brand", "naloxone_generic",
        //         "naltrexone", "naltrexone_brand", "naltrexone_generic"])
        //     .range(["#1696d2", "#46ABDB", "#A2D4EC",
        //         "#FDBF11", "#FDD870", "#FCE39E",
        //         "#000", "#696969", "#9d9d9d"]);

    var fullKeys;
    var menuFullHeights = {};

    // var PCTFORMAT = d3.format(".0%");
    // var COMMAFORMAT = d3.format(",");

    ///////////////////////// FUNCTIONS TO DO WITH DROPDOWN //////////////////////////
    // Turn dropdown into jQuery UI selectmenu
    $( function() {
        $( "#stateDropdown" ).selectmenu({
            change: function( event, data ) {
                // pymChild.sendMessage("selectState", data.item.value);
                getSelections();
            },
            open: function(event, data) {
            //     d3.select("#mapMask")
            //         .attr("width", function(d){ return d[0]})
            //         .attr("height", function(d){ return d[1] })

                // var menuHeight = d3.select(".stateSelection").node().getBoundingClientRect().height;
                var menuTop = d3.select("#stateDropdown-button").node().getBoundingClientRect().bottom;
                var containerHeight = d3.select(".main").node().getBoundingClientRect().height;
                d3.select("#stateDropdown-menu").style("height", containerHeight - menuTop + "px");
            }
            // close: function(event, data){
            //     d3.select("#mapMask")
            //         .transition()
            //         .duration(0)
            //         .delay(200)
            //         .attr("width",0).attr("height",0)
            // }
        });
    });

    //////////////////////////////////////////////////////////////////////////////////



    ///////////////////////// FUNCTIONS TO DO WITH CHART //////////////////////////////

    var stack = d3.stack();

    var area = d3.area()
        .x(function(d, i) { return xScale(d.data.date); })
        .y0(function(d) { return yScale(d[0]); })
        .y1(function(d) { return yScale(d[1]); });

    // var clickEvent = isIE() ? "mouseup" : "click";

    function drawGraphic(containerWidth) {
        // set up chart dimensions
        if (containerWidth == undefined || isNaN(containerWidth) || containerWidth > 960) {
            containerWidth = 960;
        }

        // var width = Math.min(containerWidth, 200 - margin["left"] - margin["right"]),
        var width = (containerWidth > 769) ? containerWidth - 270 - margin["left"] - margin["right"] : containerWidth - margin["left"] - margin["right"],
            height = width * 0.75 - margin["top"] - margin["bottom"];

        if(containerWidth < 450) {
            height = width * 0.85 - margin["top"] - margin["bottom"];  // make chart slightly taller on small screens
        }

        // clear chart div before redrawing
        $("#areaChart").empty();

        // set up scales based on iframe width and height
        xScale.domain(d3.extent(opioidsData, function(d) { return d.date; })).range([0, width]);
        yScale.rangeRound([height, 0]);

        // get earliest date in data - need this to help with transitioning areas
        minDate = d3.min(opioidsData, function(d) { return d.date; });

        // initial view loads National data
        createChart("areaChart", "National", "quarterly", "adjmedamt_gb", width, height);

        // store menu heights in object so can transition opening/closing them
        getMenuHeights();

        if (containerWidth <= 769) {
            closeAllMenus();

            // explicitly set height of .main div so we can transition it when filter menus are opened/closed
            var onLoadMainHeight = d3.select(".main").node().getBoundingClientRect().height;
            d3.select(".main").style("height", onLoadMainHeight + "px");
        }

        // This is calling an updated height.
        if (pymChild) {
            pymChild.sendHeight();
        }

        // save height of div for when filter menus open/close on small screens
        originalHeight = d3.select(".main").node().getBoundingClientRect().height;
    }

    // parse data and draw plots
    d3.csv("data/opioids_data.csv", function(d) {
            return {
                state: d.state,
                temporal_unit: d.temporal_unit,
                date: parseDate(d.date),
                metric: d.metric,
                futurerevision: d.futurerevision,
                // all_percap: +d.all_percap,
                // all_total: +d.all_total,
                buprenorphine: +d.buprenorphine,
                naloxone: +d.naloxone,
                naltrexone: +d.naltrexone,
                // all_brand: +d.all_brand,
                // all_generic: +d.all_generic,
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
        console.log(opioidsData);

        fullKeys = data.columns.slice(5);

        pymChild = new pym.Child({renderCallback: drawGraphic, polling: 50});

        // pymChild.onMessage("selectionChanged", updateChart);
    });

    function createChart(parentElement, state, temporal_unit, metric, width, height) {
        var data = getData(state, temporal_unit, metric, fullKeys);

        // var keys = ['buprenorphine_generic', 'buprenorphine_brand', 'naloxone_generic', 'naloxone_brand', 'naltrexone_generic', 'naltrexone_brand'];

        stack.keys(fullKeys);

        // set yScale domain based on data selected
        yScale.domain([0, d3.max(stack(data), function(d) { return d3.max(d, function(d) { return d[1]; }); })]).nice();

        var xAxis = d3.axisBottom(xScale).ticks(d3.timeMonth.every(3));
        if(width + margin.left + margin.right < 400) xAxis.tickFormat(d3.timeFormat("'%y"));

        var svg = d3.select("#" + parentElement)
            .append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        svg.append("g")
            .attr("class", "axis axis--y")
            .call(d3.axisLeft(yScale).tickSize(-width).tickFormat(BILLIONS));

        // add label for y-axis
        svg.append("text")
            .attr("class", "yaxisLabel")
            .attr("x", -margin["left"])
            .attr("y", -margin["top"] + 12)
            .text("Dollars")

        var layer = svg.selectAll(".area")
            .data(stack(data))
            .enter()
            .append("path")
            .attr("class", function(d) { return "area " + d.key; })
            // .style("fill", function(d) { return colorScale(d.key); })
            .attr("d", area);

        svg.append("g")
            .attr("class", "axis axis--x")
            .attr("transform", "translate(0," + height + ")")
            .call(xAxis);

        // get rid of tick labels for quarters 2-4 (i.e., only label the start of the year)
        // source: https://stackoverflow.com/questions/38921226/show-every-other-tick-label-on-d3-time-axis
        var ticks = d3.selectAll(".axis--x .tick text");
        ticks.attr("class", function(d, i) {
            if(i % 4 !== 0) d3.select(this).remove();
        });
    }

    function getData(state, temporal_unit, metric, keys) {
        var newData = opioidsData.filter(function(d) { return d.state === state && d.temporal_unit === temporal_unit && d.metric === metric; });

        var newData2 = [];
        if(keys !== fullKeys) {
            // if not all drugs are selected, set the data values for non-selected drugs to zero so that
            // the stack hides nicely
            var notInFullKeys = fullKeys.filter(function(k) { return keys.indexOf(k) < 0; });
            newData.forEach(function(d) {
                var obs = {};
                obs.state = d.state;
                obs.temporal_unit = d.temporal_unit;
                obs.date = d.date;
                obs.metric = d.metric;
                fullKeys.forEach(function(k) { (keys.indexOf(k) > -1) ? obs[k] = d[k] : obs[k] = 0; });
                newData2.push(obs);
            });
            return newData2;
        }
        else {
            return newData;
        }
    }


    // update tool with selected state's information
    function updateChart(metric, state, timeUnit, keys) {
        var data = getData(state, timeUnit, metric, keys);
        stack.keys(fullKeys);

        // update ticks in x-axis if needed
        var ticks = d3.selectAll(".axis--x .tick line");
        if(timeUnit === "annual") {
            // if time unit is annual, hide ticks that appear for quarters 2-4
            ticks.style("opacity", function(d, i) {
                if(i % 4 !== 0) return 0;
            });
        }
        else if(timeUnit === "quarterly") {
            // if time unit is quarterly, show all ticks
            ticks.style("opacity", 1);
        }

        // set yScale domain and y-axis tick formats based on data selected
        if(keys.length > 0) {
            yScale.domain([0, d3.max(stack(data), function(d) { return d3.max(d, function(d) { return d[1]; }); })]).nice();
            var percap = metric.indexOf("_percap") > -1;
            updateAxis(percap);
        }

        // update y-axis label if needed
        metric === "adjmedamt" ? d3.select(".yaxisLabel").text("Dollars") : d3.select(".yaxisLabel").text("Number of prescriptions")

        var layer = d3.select("#areaChart svg g").selectAll(".area")
            .data(stack(data), function(d) { return d.key; });

        layer.transition()
            // .duration(5000)
            .attrTween("d", function(d) {
                var previous = d3.select(this).attr("d");
                var current = area(d);
                return d3.interpolatePath(previous, current, excludeSegment);
            });
    }

    function updateAxis(percap) {
        var width = d3.select("#areaChart g").node().getBoundingClientRect().width;

        // if viewing per capita data, don't use SI units on y-axis
        if(percap) {
            d3.select("#areaChart .axis.axis--y")
                .transition()
                .call(d3.axisLeft(yScale).tickSize(-width));
        }
        else {
            d3.select("#areaChart .axis.axis--y")
                .transition()
                .call(d3.axisLeft(yScale).tickSize(-width).tickFormat(BILLIONS));
        }
    }

    function excludeSegment(a, b) {
        return a.x === b.x && (a.x === xScale(minDate) || a.x === xScale(new Date(2018, 0, 1)));
    }

    function updateLegend(legend, drugs) {
        d3.selectAll(legend + " .legendGroup").classed("notSelected", true);
        drugs.forEach(function(d) {
            d3.select(legend + " .legendGroup." + d).classed("notSelected", false);
        });
    }
    //////////////////////////////////////////////////////////////////////////

    //////////////////////// GET USER SELECTIONS /////////////////////////////
    // d3.selectAll("input[name='perCapita']").on("change", getSelections);
    d3.selectAll("input[name='metric']").on("change", getSelections);
    d3.select("input#all").on("change", handleCheckboxLogic);
    d3.selectAll("input.drugSuboption").on("change", getSelections);
    d3.selectAll("#brandGenericToggle").on("click", toggleSwitch);
    d3.select("#stateDropdown").on("change", getSelections);
    d3.selectAll("input[name='timeUnit']").on("change", getSelections);

    function getSelections() {
        // var perCapita = getPerCapita();
        var metric = getMetric();
        var drugs = getDrug();
        var brandgeneric = d3.select("#brandGenericToggle").classed("on");
        var geo = getGeography();
        var timeUnit = getTimeUnit();

        // get metric
        // if(perCapita) {
        //     metric = metric + "_percap";
        // }
        if(brandgeneric) {
            metric = metric + "_gb";
        }

        // build array of keys
        var newKeys = [];
        if(drugs.length < 3) {
            drugs.forEach(function(drug) {
                newKeys.push(drug);
                newKeys.push(drug + "_generic");
                newKeys.push(drug + "_brand");
            });
        }
        else {
            newKeys = fullKeys;
        }

        updateChart(metric, geo, timeUnit, newKeys);
        // console.log(drugs);

        // update legend based on selections
        if(brandgeneric) {
            updateLegend(".brandGeneric", drugs);
            d3.select(".brandGeneric.chartLegend").classed("hidden", false);
            d3.select(".allDrugs.chartLegend").classed("hidden", true);
        }
        else {
            updateLegend(".allDrugs", drugs);
            d3.select(".brandGeneric.chartLegend").classed("hidden", true);
            d3.select(".allDrugs.chartLegend").classed("hidden", false);
        }

        // build an object of user selections to highlight selections with
        var userSelections = {};
        // userSelections.percap = perCapita;
        userSelections.metric = metric.split("_")[0];
        userSelections.drugs = drugs.map(function(d) { return capitalizeWord(d); });
        userSelections.state = geo;
        userSelections.time = timeUnit;
        highlightSelections(userSelections);

        // if per capita is checked, need to disable the generic/brand checkboxes
        // and vice versa
        // perCapita ? d3.selectAll(".brandGenericSelection").classed("disabled", true) : d3.selectAll(".brandGenericSelection").classed("disabled", false);
    }

    function highlightSelections(selections) {
        d3.selectAll("label").classed("selected", false);

        // if(selections.percap) d3.select("label[for='perCapita']").classed("selected", true);

        d3.select("label[for='" + selections.metric + "']").classed("selected", true);

        if(selections.drugs.length === 3) {
            d3.select("label[for='all']").classed("selected", true);
        }
        else {
            selections.drugs.forEach(function(drug) {
                d3.select("label[for='" + drug.toLowerCase() + "']").classed("selected", true);
            })
        }

        d3.select("label[for='" + selections.time + "']").classed("selected", true);
    }

    function handleCheckboxLogic() {
        var checkedAll = d3.select("input#all").property("checked");

        // if "all drugs" selected, all three suboptions should be checked
        if(checkedAll) checkAllDrugBoxes();
        else uncheckAllDrugBoxes();

        getSelections();
    }

    function toggleSwitch() {
        if(d3.select("#brandGenericToggle").classed("on")) {
            d3.select("#brandGenericToggle").classed("on", false);
            d3.select("#brandGenericToggle").classed("off", true);

            // allow per capita checkbox to be selected
            // d3.select("input[name='perCapita']").property("disabled", false);
            // d3.select("label[for='perCapita']").classed("disabled", false);
        }
        else if(d3.select("#brandGenericToggle").classed("off")) {
            d3.select("#brandGenericToggle").classed("on", true);
            d3.select("#brandGenericToggle").classed("off", false);

            // disable per capita checkbox
            // d3.select("input[name='perCapita']").property("disabled", true);
            // d3.select("label[for='perCapita']").classed("disabled", true);
        }

        getSelections();
    }

    function getDrug() {
        var selectedDrugs = [];

        var checkedDrugs = d3.selectAll("input.drugSuboption:checked").nodes();
        // console.log(checkedDrugs);

        // trigger whether "All" should be checked based on number of individual drugs selected
        if(checkedDrugs.length < 3) uncheckBox("#all");  // document.querySelectorAll("input#all").indeterminate = true;
        else if(checkedDrugs.length === 3) checkBox("#all")

        // get list of drugs selected
        for(var i = 0; i < checkedDrugs.length; i++) {
            selectedDrugs.push(checkedDrugs[i].value);
        };

        return selectedDrugs;
    }

    // function getPerCapita() {
    //     return d3.select("#perCapita").property("checked");
    // }

    function getMetric() {
        return d3.selectAll("input[name='metric']:checked").property("value");
    }

    function getBrandGeneric() {
        if(d3.select("#brandGenericToggle").classed("on")) {
            return ['brand', 'generic'];
        }
        else if(d3.select("#brandGenericToggle").classed("off")) {
            return [];
        }
    }

    function getGeography() {
        return d3.select("#stateDropdown").property("value");
    }

    function getTimeUnit() {
        return d3.selectAll("input[name='timeUnit']:checked").property("value");
    }

    /////////////////////// controls for toggling menus //////////////////////////
    function getMenuHeights() {
        var menus = ["metricSelection", "drugSelection", "stateSelection", "timeSelection"];
        menus.forEach(function(m) {
            var menuHeight = d3.select("." + m + ".selectionDiv").node().getBoundingClientRect().height;

            // store menu heights when in fully opened state so we know what heights to transition these to
            menuFullHeights["." + m] = menuHeight;

            // also store these heights as style properties in the DOM elements so we can use d3 to transition the heights
            d3.select("." + m + ".selectionDiv").style("height", menuHeight + "px");
        })
    }

    function closeAllMenus() {
        var menus = ["metricSelection", "drugSelection", "stateSelection", "timeSelection"];
        menus.forEach(function(m) {
            d3.select("." + m + ".selectionDiv").classed("closed", true);
            d3.select("." + m + " .arrowImage").classed("rotate180", true);
            d3.select("." + m + ".selectionDiv").style("height", "0px");
        })
    }

    d3.select(".metricSelection.menuHeader").on("click", function() { toggleMenu(".metricSelection"); });
    d3.select(".drugSelection.menuHeader").on("click", function() { toggleMenu(".drugSelection"); });
    d3.select(".stateSelection.menuHeader").on("click", function() { toggleMenu(".stateSelection"); });
    d3.select(".timeSelection.menuHeader").on("click", function() { toggleMenu(".timeSelection"); });

    function toggleMenu(menu) {
        var menuIsClosed = d3.select(menu + ".selectionDiv").classed("closed");
        var currentMainHeight = d3.select(".main").node().getBoundingClientRect().height;
        var currentMainWidth = d3.select(".main").node().getBoundingClientRect().width;

        if(menuIsClosed) {
            // first adjust main div height to final height (if on a small screen)
            if(currentMainWidth < 768) {
                d3.select(".main")
                    .transition(500)
                    .style("height", currentMainHeight + menuFullHeights[menu] + "px");
            }

            // then open the menu and adjust selectionDiv height
            d3.select(menu + ".selectionDiv").classed("closed", false);
            d3.select(menu + ".selectionDiv")
                .transition(500)
                .style("height", menuFullHeights[menu] + "px");
                // .on("end", adjustMainDivHeight);
            d3.select(menu + " .arrowImage").classed("rotate180", false);

        }
        else {
            if(currentMainWidth < 768) {
                d3.select(".main")
                    .transition(500)
                    .style("height", currentMainHeight - menuFullHeights[menu] + "px");
            }

            d3.select(menu + ".selectionDiv").classed("closed", true);
            d3.select(menu + ".selectionDiv")
                .transition(500)
                .style("height", "0px");
                // .on("end", adjustMainDivHeight);
            d3.select(menu + " .arrowImage").classed("rotate180", true);
        }
    }

    function adjustMainDivHeight() {
        // var mainheight = d3.select(".main").node().getBoundingClientRect().height;
        var selectionMenuHeight = d3.select(".userSelections").node().getBoundingClientRect().height;

        if(selectionMenuHeight > originalHeight) {
            // set .main height to selection menu height
            d3.select(".main").transition().style("height", selectionMenuHeight + "px");
        }
        else {
            // set .main height back to original height
            d3.select(".main").transition().style("height", originalHeight + "px");
        }
        // console.log("iframe height:", mainheight);
        // console.log("selection menu height:", selectionMenuHeight);
        pymChild.sendHeight();
    }

    // functions for opening/closing selection menu panel on small screens
    d3.select(".filterBtn").on("click", function() { d3.select("section.userSelections").classed("slideIn", true);
                                                     adjustMainDivHeight(); });

    function toggleFilters() {
        var filtersAreClosed = d3.select("section.userSelections").classed("hidden");

        if(filtersAreClosed) {
            d3.select("section.userSelections").classed("slideIn", false);
        }
        else {
            d3.select("section.userSelections").classed("slideIn", true);
        }
    }

    d3.select(".closeBtn").on("click", function() { d3.select("section.userSelections").classed("slideIn", false);
                                                    d3.select(".main").transition().style("height", originalHeight + "px");
                                                    // pymChild.sendHeight();
                                                    });

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

    /////////////////////// string cleaning functions ////////////////////
    function capitalizeWord(word) {
        return word.charAt(0).toUpperCase() + word.slice(1);
    }
})();