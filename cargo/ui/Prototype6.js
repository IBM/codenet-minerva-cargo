
var nodes
var linkData

var numPartitions

const width  = 1400;
const height = 800;
const colors = d3.scaleOrdinal(d3.schemeCategory10);

var node 
var groupIds
var colorPartition
var isDragged = 0

const svg = d3.select(".container-right")
              .append("svg")
              .attr("class","graphSVG")
              .attr("width", width)
              .attr("height", height);

var linksExpanded=0

var movedNodes=[]

var minSlider
var maxSlider
// at first, add the top node, and its children by using expand()
var links = [];
var newLinks
var newLinksFiltered


var force = d3.forceSimulation(nodes)
                .force("x", d3.forceX(d => {
                  //return 10
                  var deltaX = Math.random() *100//returns random number between 0 and 1
                  var partitionNames=[]
                  groupIds.forEach(function(partition){
                    partitionNames.push(partition.groupId)
                  })
                  var partitionNum= partitionNames.indexOf(String(d.partition))
                  if (partitionNum != -1){
                    return (width /(numPartitions+1) * partitionNum)+ deltaX
                  }
                  else{
                    return (width / (numPartitions+1)) + deltaX
                  }
                }).strength(0.99))
                .force("y", d3.forceY(height/6).strength(0))
                .force("center", d3.forceCenter(width / 2, height / 2))
                // .force("cluster", forceCluster())
                .force("collide", forceCollide())
                .force("charge", d3.forceManyBody().distanceMin(100).distanceMax(150))


function createLinksNum(links){
  //sort links by source, then target
  links.sort(function(a,b) {
    if (a.source > b.source) {return 1;}
    else if (a.source < b.source) {return -1;}
    else {
        if (a.target > b.target) {return 1;}
        if (a.target < b.target) {return -1;}
        else {return 0;}
    }
  });

  //any links with duplicate source and target get an incremented 'linknum'
  for (var i=0; i<links.length; i++) {
    if (i != 0 &&
        links[i].source == links[i-1].source &&
        links[i].target == links[i-1].target) {
            links[i].linknum = links[i-1].linknum + 1;
        }
    else if (i != 0 &&
      links[i].source == links[i-1].target &&
      links[i].target == links[i-1].source) {
          links[i].linknum = links[i-1].linknum + 1;
      }
    else {links[i].linknum = 1;};
  };
  return links
}
                
                
function loadData(){
  d3.json("data/partitions.json").then((d) => {
    console.log("d is ",d)
    nodes = d.nodes

    groupIds = d3.set(nodes.map(n => { return n.partition; }))
                  .values()
                  .map( groupId =>  {
                    return { 
                    groupId : groupId,
                    partitionType: nodes.filter(n => { 
                      if (n.partition == groupId){
                        return n.type; 
                      }
                    })[0].type,
                    count : nodes.filter(n => { return n.partition == groupId; }).length
                    };
                  })
                  // .filter( group => { return group.count > 2;})
                  //.map( group => { return group.groupId; });

    console.log("groupIds is ",groupIds)

    linkData = d.links

    numPartitions=0
    //create original links
    linkData.forEach(function(link) {
      var sourceName= link.source
      var targetName= link.target
      var nodeSource
      var nodeTarget
      var linkChildren=[]

      //create parent links
      nodes.forEach(function(node) {
        if (node.partition > numPartitions){
          numPartitions= node.partition
        }
        if (node.name == link.source){
          nodeSource = node
        }
        if (node.name == link.target){
          nodeTarget = node
        }
      });

      //create children links
      link.children.forEach(function(childLink) {
        var targetChildNode
        nodeTarget.children.forEach(function(childNode) {
          if (childLink.target == childNode.name){
            targetChildNode = childNode
          }
        })
        var sourceChildNode
        nodeSource.children.forEach(function(childNode) {
          if (childLink.source == childNode.name){
            sourceChildNode = childNode
          }
        })
        linkChildren.push({source:sourceChildNode, target: targetChildNode})
      })
      links.push({ source: nodeSource, target: nodeTarget, children: linkChildren, weight: link.weight,type:link.type });
    });

    links = createLinksNum(links)

    minSlider=99999999
    maxSlider=0
    links.forEach(function(link){
      if (parseInt(link.weight)>maxSlider){
        maxSlider = parseInt(link.weight)
      }
      if (parseInt(link.weight)<minSlider){
        minSlider = parseInt(link.weight)
      }
    })
    document.getElementById("minSlider").min = minSlider;
    document.getElementById("minSlider").value = minSlider
    document.getElementById("maxSlider").max = maxSlider;
    document.getElementById("maxSlider").value = maxSlider;

    document.getElementById("minNumber").value = minSlider;
    document.getElementById("maxNumber").value = maxSlider;

    minEdgeWeight = parseInt(document.getElementById("minSlider").value)
    maxEdgeWeight = parseInt(document.getElementById("maxSlider").value)

    setup(nodes,links, numPartitions);
  })  
}

loadData()
                
// set the color scale
var linkColors = d3.scaleOrdinal()
    .domain(["heap_dependency", "data_dependency", "read", "write"])
    .range(["#888888","#888888","#888888","#565656"]);

var linkColors2 = d3.scaleOrdinal(d3.schemeCategory10)

var defs = svg.append("svg:defs");

function marker(linkColors2) {
    defs.append("svg:marker")
        .attr("id", linkColors2.replace("#", ""))
        // .attr("viewBox", "0 -5 10 10")
        .attr("viewBox", "0 0 10 10")
        .attr("refX", 7)// This sets how far back it sits, kinda
        .attr("refY", 5)
        .attr("markerWidth", 10)
        .attr("markerHeight", 10)
        .attr("orient", "auto")
        .attr("markerUnits", "userSpaceOnUse")
        .append("svg:path")
        .attr("class", "arrowHead")
        // .attr("d", "M0,-5L10,0L0,5")
        .attr("d", "M 0 0 L 10 5 L 0 10 z")
        .attr("fill", linkColors2)
        .style("fill-opacity", "0.7");
    return "url(" + linkColors2 + ")";
};

//==================================================
//=============Side Menu Functions==================
//==================================================
function openNav(type, d) {
    if (type=="partition"){ //click on partition
      d3.select('#chartSVG').remove() //remove bar chart showing contained methods
      document.getElementById("navTitle").innerText = "Partition name: "+d
      document.getElementById("description").innerText = "This partition describes the set of modules and data tables belonging to the client business use case"
      // document.getElementById("mySidenav").style.width = "250px";       //open navigation menu
      
      document.getElementById("navTitle").style.display = "block"
      document.getElementById("navTitleLabel").style.display = "none"
      document.getElementById("navTitle").placeholder = d //display placeholder

      //==================================================
      //========Edit Partition Name in side menu==========
      //==================================================
      d3.selectAll("#navTitle").on("keypress", function() {
        if(d3.event.keyCode === 13){
          var newPartitionName= d3.select(this).property("value")
          var oldPartitionName= d3.select(this).property("placeholder")
          //==========================================================
          //====Change partition name in method and classes data======
          //==========================================================
          originalMethodData.nodes.forEach(node => {
            if (node.partition == oldPartitionName){
              //change all partitions to new one
              node.partition = newPartitionName
            }
          })
          originalClassData.nodes.forEach(node => {
            if (node.partition == oldPartitionName){
              //change all partitions to new one
              node.partition = newPartitionName
              node.method_partitions = node.method_partitions.toString().split(',') //convert method partition to string
              function getAllIndexes(arr, val) {
                var indexes = [], i = -1;
                while ((i = arr.indexOf(val, i+1)) != -1){
                    indexes.push(i);
                }
                return indexes;
            }
              var itemIndices= getAllIndexes(node.method_partitions,oldPartitionName)
              itemIndices.forEach(index => {
                node.method_partitions[index] = newPartitionName //swap old partition for new partition in method_partitions array
              })
            }
          })
          d3.selectAll("#graphSVGMethod").remove()
          d3.selectAll("#graphSVGClass").remove()
          d3.selectAll(".tooltip").remove()
          if (methodOrClass == "method"){
            renderChart(originalMethodData,dataSourceMethods)
          }
          else if (methodOrClass == "class"){
            renderChart(originalClassData,dataSourceClasses)
          }
          document.getElementById("navTitle").placeholder = newPartitionName //change partition name placeholder
          document.getElementById("navTitle").value = ""//clear input box
        }
      })

    }
    else if (type=="class"){ //click on class node
      document.getElementById("navTitle").style.display = "none"
      document.getElementById("navTitleLabel").style.display = "block"
      document.getElementById("navTitleLabel").innerText = d.name
      document.getElementById("description").innerText = "Total number of methods: "+ d.children.length

      //remove chart svg
      d3.select('#chartSVG').remove()

      var dataPartitions= []
      d.children.forEach(function(childNode){
        dataPartitions.push(childNode.partition)
      })

      var sampleData = Array.from(new Set(dataPartitions)).map(a =>
        ({label:a, value: dataPartitions.filter(f => f === a).length}));

      var colorTest=  d3.scaleOrdinal()
                    .domain(Object.keys(sampleData))
                    .range(d3.schemeDark2)

      function groupData (data, total) {
        // use scale to get percent values
        const percent = d3.scaleLinear()
          .domain([0, total])
          .range([0, 100])
        // filter out data that has zero values
        // also get mapping for next placement
        // (save having to format data for d3 stack)
        let cumulative = 0
        const _data = data.map(d => {
          cumulative += d.value
          return {
            value: d.value,
            // want the cumulative to prior value (start of rect)
            cumulative: cumulative - d.value,
            label: d.label,
            percent: percent(d.value)
          }
        }).filter(d => d.value > 0)
        return _data
      }

      var bind = ".chart"
      var data= sampleData
      var config = {
        f: d3.format('.1f'),
        margin: {top: 40, right: 30, bottom: 40, left: 1},
        width: 220,
        height: 100,
        barHeight: 40,
      }

      const { f, margin, width, height, barHeight, colors } = config
      const w = width - margin.left - margin.right
      const h = height - margin.top - margin.bottom
      const halfBarHeight = barHeight / 2

      const total = d3.sum(data, d => d.value)
      const _data = groupData(data, total)

      // set up scales for horizontal placement
      const xScale = d3.scaleLinear()
        .domain([0, total])
        .range([0, w])

      // create svg in passed in div
      const selection = d3.selectAll("#nodePie")
        .append('svg')
        .attr("id","chartSVG")
        .attr('width', width)
        .attr('height', height)
        .append('g')
        .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')')

      console.log("selection is ",selection)
      // stack rect for each data value
      selection.selectAll('rect')
        .data(_data)
        .enter().append('rect')
        .attr('class', 'rect-stacked')
        .attr('x', d => xScale(d.cumulative))
        .attr('y', h / 2 - halfBarHeight)
        .attr('height', barHeight)
        .attr('width', d => xScale(d.value))
        // .style('fill', (d, i) => colors[i])
        .style('fill', function(d){
          console.log("d is ",d)
          // return "#8888"
          return colorPartition(d.label)
        }) 
        
      // add values on bar
      selection.selectAll('.text-value')
        .data(_data)
        .enter().append('text')
        .attr('class', 'text-value')
        .attr('text-anchor', 'middle')
        .attr('x', d => xScale(d.cumulative) + (xScale(d.value) / 2))
        .attr('y', (h / 2) + 5)
        .text(d => d.value)
        .style('fill', "white")


      // add some labels for percentages
      selection.selectAll('.text-percent')
        .data(_data)
        .enter().append('text')
        .attr('class', 'text-percent')
        .attr('text-anchor', 'middle')
        .attr('x', d => xScale(d.cumulative) + (xScale(d.value) / 2))
        .attr('y', (h / 2) - (halfBarHeight * 1.1))
        .text(d => f(d.percent) + ' %')
        .style('fill', "white")


      // add the labels
      selection.selectAll('.text-label')
        .data(_data)
        .enter().append('text')
        .attr('class', 'text-label')
        .attr('text-anchor', 'middle')
        .attr('x', d => xScale(d.cumulative) + (xScale(d.value) / 2))
        .attr('y', (h / 2) + (halfBarHeight * 1.1) + 20)
        // .style('fill', (d, i) => colors[i])
       .style('fill', d=> colorPartition(d.label))
        // .style('fill', "#888888")
        .text(d => d.label)

    }
    else if (type=="method"){ //click on method node
      d3.select('#chartSVG').remove() //remove bar chart showing contained methods

      // document.getElementById("nodeType").innerText = "Entity Type: "+entityTypes[d.data.entity_type-1]
      document.getElementById("navTitleLabel").style.display = "block"
      document.getElementById("navTitle").style.display = "none"
      document.getElementById("navTitleLabel").innerText = d.name
      document.getElementById("description").innerText = ""
    }
}
//==================================================
//=================Repartition=======================
//==================================================
d3.selectAll("#repartitionBtn").on("click",function(){
  console.log("moved nodes is ",movedNodes)
})
    
//==================================================
//===================Min- Max Edge Weight===========
//==================================================

var minEdgeWeight=0
var maxEdgeWeight=99999999

function setup(callOrigin) {
    //var newLinks = []

    let rangeMin = 1;
    const range = document.querySelector(".range-selected");
    const rangeInput = document.querySelectorAll(".range-input input");
    const rangePrice = document.querySelectorAll(".range-price input");

    rangeInput.forEach((input) => {
      input.addEventListener("change", (e) => {
        let minRange = parseInt(rangeInput[0].value);
        let maxRange = parseInt(rangeInput[1].value);
        if (maxRange - minRange < rangeMin) {     
          if (e.target.className === "min") {
            rangeInput[0].value = maxRange - rangeMin;        
          } else {
            rangeInput[1].value = minRange + rangeMin;        
          }
        } else {
          rangePrice[0].value = minRange;
          rangePrice[1].value = maxRange;
          range.style.left = (minRange / rangeInput[0].max) * 100 + "%";
          range.style.right = 100 - (maxRange / rangeInput[1].max) * 100 + "%";

          maxEdgeWeight = maxRange
          minEdgeWeight = minRange
        }

        svg.selectAll(".link").remove()

        svg.selectAll(".link")
            .data(newLinksFiltered)
            .enter().append("path")
            .filter(function(d){
              return (d.weight >= minEdgeWeight && d.weight <= maxEdgeWeight)
            })
            .attr("id",function(d,i){
              return "linkId_"+i
            })
            .classed('link', true)
            .style("stroke","#565656")
            .style("stroke-opacity","0.7")
            .style("stroke-width",1)
            .each(function(d) {
              var thisColor = linkColors("write")
              d3.select(this)
                  .style("stroke", thisColor)
                  .attr("marker-end", marker(thisColor))
            });
        ticked()
      });
    });
    rangePrice.forEach((input) => {
      input.addEventListener("input", (e) => {
        let minPrice = rangePrice[0].value;
        let maxPrice = rangePrice[1].value;
        if (maxPrice - minPrice >= rangeMin && maxPrice <= rangeInput[1].max) {
          if (e.target.className === "min") {
            rangeInput[0].value = minPrice;
            range.style.left = (minPrice / rangeInput[0].max) * 100 + "%";
          } else {
            rangeInput[1].value = maxPrice;
            range.style.right = 100 - (maxPrice / rangeInput[1].max) * 100 + "%";
          }
        }
      });
    });


    function createNewLinks(){
      newLinks = []
    
      //draw links between current method nodes for nodes that are expanded
      //for links that aren't expanded, replace method name by class name
      links.forEach(function(link){
        var targetNode= link.target
        var sourceNode=link.source
        //both nodes are expanded
        //draw connections between methods of both classes
        if (sourceNode.expanded ==true & targetNode.expanded ==true){
          //draw expanded links (children of current link)
          (link.children || []).forEach(function(childLink) {
              var thisLink = {source: childLink.source, target: childLink.target, weight:1}
              newLinks.push(thisLink)
          })
        }  
        //target node is expanded
        else if (targetNode.expanded ==true){
          //source node is not expanded
          if (sourceNode.expanded != true){
            //draw connection from class to methods
            (targetNode.children || []).forEach(function(childNode) {
              var thisLink = {source: sourceNode, target: childNode, weight:1, type:link.type}
              newLinks.push(thisLink)
            })
          }
        }
        //source node is expanded
        else if (sourceNode.expanded ==true){
          //target node is not expanded
          if (targetNode.expanded != true){
            //draw connection from methods to class
            (sourceNode.children || []).forEach(function(childNode) {
              var thisLink = {source: childNode, target: targetNode, weight:1, type:link.type}
              newLinks.push(thisLink)
            })
          }
        }
        //neither node is expanded
        //draw connections between two classes
        else if (sourceNode.expanded !=true & targetNode.expanded !=true){
          var thisLink = {source: sourceNode, target: targetNode, weight:link.weight, type:link.type}
          newLinks.push(thisLink)
        }  
      })
    }
    
    createNewLinks()
    createLinksNum(newLinks)
    newLinksFiltered = newLinks
    
    //==================================================
    //===================Filter links===================
    //==================================================

    function filterLinks(){
      var checkedLinks=[]
      var boxes = d3.selectAll("input.checkbox:checked");
      boxes.each(function() {
        checkedLinks.push(this.value)
      })
      if (checkedLinks.includes("ALL")){
        createNewLinks()
        createLinksNum(newLinks)
        newLinksFiltered = newLinks
      }
      else{
        newLinksFiltered = newLinks.filter(function(l){
          return checkedLinks.includes(l.type)
        })
      }
      ticked()
    }
    d3.selectAll(".checkbox").on("click", function() {
      filterLinks()

      svg.selectAll(".link").remove()

      svg.selectAll(".link")
        .data(newLinksFiltered)
        // .data(links)
        .enter().append("path")
        .filter(function(d){
          return (d.weight >= minEdgeWeight && d.weight <= maxEdgeWeight)
        })
        .attr("id",function(d,i){
          return "linkId_"+i
        })
        .classed('link', true)
        .style("stroke","#565656")
        .style("stroke-opacity","0.7")
        .style("stroke-width",1)
        .each(function(d) {
          // var thisColor = linkColors(Object.getPrototypeOf(d).transaction_type)
          var thisColor = linkColors("write")
          d3.select(this)
              // .style("stroke", "#888888")
              // .attr("marker-end", "#888888")
              .style("stroke", thisColor)
              .attr("marker-end", marker(thisColor))
        });
      

      ticked()

    })
    filterLinks()
    //===========================================================
    //=================Expand Links function=====================
    //===========================================================
    function expandLinks(){
      //TO DO: If classes, don't display links to itself
    
      var arrayTypes=[]
      newLinksFiltered.forEach(function(link){
          var thisLink = Object.assign({}, link) //deep copy
          thisLink.type=link.type
          arrayTypes.push(thisLink)
      })
      newLinksFiltered = arrayTypes
    }
    //=========================================
    //============Draw Link Arrows=============
    //=========================================

    expandLinks()
    createLinksNum(newLinksFiltered)
  
    svg.selectAll(".link").remove()
  
    function noClassLinks(link) {
      return link.source.name != link.target.name
    }
    
    var newLinksFiltered2 = newLinksFiltered.filter(noClassLinks)

    svg.selectAll(".link").remove()

    svg.selectAll(".link")
      .data(newLinksFiltered2)
      // .data(links)
      .filter(function(d){
        return (d.weight >= minEdgeWeight && d.weight <= maxEdgeWeight)
      })
      .enter().append("path")
      .attr("id",function(d,i){
        return "linkId_"+i
      })
      .classed('link', true)
      .style("stroke","#565656")
      .style("stroke-opacity","0.7")
      .style("stroke-width",1)
      .each(function(d) {
        // var thisColor = linkColors(Object.getPrototypeOf(d).transaction_type)
        var thisColor = linkColors("write")
        d3.select(this)
            .style("stroke", thisColor)
            .attr("marker-end", marker(thisColor))
      });

    svg.selectAll(".node")
        .attr("transform", function(d) { 
            d.fixed=true; 
            //bind position of node to stay within svg
            d.x = Math.max(10, Math.min(width - 10, d.x)); 
            d.y = Math.max(10, Math.min(height - 10, d.y)); 
            return "translate(" + d.x + "," + d.y + ")"; 
        })
        .style("fill", function(d) { 
          // return "#888888"
          return colorPartition(d.partition) 
        })

    svg.selectAll('.node').raise()

    ticked()
    // }
    // else{
      
    // }
    
    // //draw links between current method nodes for nodes that are expanded
    // //for links that aren't expanded, replace method name by class name
    // links.forEach(function(link){
    //   var targetNode= link.target
    //   var sourceNode=link.source
    //   //both nodes are expanded
    //   //draw connections between methods of both classes
    //   if (sourceNode.expanded ==true & targetNode.expanded ==true){
    //     //draw expanded links (children of current link)
    //     (link.children || []).forEach(function(childLink) {
    //         var thisLink = {source: childLink.source, target: childLink.target}
    //         newLinks.push(thisLink)
    //     })
    //   }  
    //   //target node is expanded
    //   else if (targetNode.expanded ==true){
    //     //source node is not expanded
    //     if (sourceNode.expanded != true){
    //       //draw connection from class to methods
    //       (targetNode.children || []).forEach(function(childNode) {
    //         var thisLink = {source: sourceNode, target: childNode}
    //         newLinks.push(thisLink)
    //       })
    //     }
    //   }
    //   //source node is expanded
    //   else if (sourceNode.expanded ==true){
    //     //target node is not expanded
    //     if (targetNode.expanded != true){
    //       //draw connection from methods to class
    //       (sourceNode.children || []).forEach(function(childNode) {
    //         var thisLink = {source: childNode, target: targetNode}
    //         newLinks.push(thisLink)
    //       })
    //     }
    //   }
    //   //neither node is expanded
    //   //draw connections between two classes
    //   else if (sourceNode.expanded !=true & targetNode.expanded !=true){
    //     var thisLink = {source: sourceNode, target: targetNode}
    //     newLinks.push(thisLink)
    //   }  
    // })
    //======================================
    //============Zoom on graph=======
    //======================================
    svg.call(d3.zoom().on("zoom", function () {
      svg.attr("transform", d3.event.transform)
      var zoomScale = d3.event.transform.k
      if (zoomScale > 1.2){
        d3.selectAll(".nodeLabel").style("display","block")
      }
      else{
        d3.selectAll(".nodeLabel").style("display","none")
      }
   }))
    //======================================
    //============Click outside graph=======
    //======================================
    function equalToEventTarget() {
    return this == d3.event.target;
    }
    d3.select("body").on("click",function(){
    var graphContent = d3.selectAll(".partitionRect, .link, .node");
    var outside = graphContent.filter(equalToEventTarget).empty();
    if (outside) {
        //unselect all selections
        d3.selectAll('rect').classed("partitionClicked", false);
        d3.selectAll('rect').classed("partitionNotClicked", true);
        d3.selectAll('.node').classed("clicked", false);
        d3.selectAll('.node').classed("notClicked", false);
        d3.selectAll('.link').classed("clicked", false);
        d3.selectAll('.link').classed("notClicked", false);
        //nav overview
        document.getElementById("navTitle").innerText = "Overview"
        document.getElementById("description").innerText = "This is an overview of the current partitioning"
        document.getElementById("dataCentrality").innerText = ""
        document.getElementById("useCase").innerText = ""
        document.getElementById("nodePie").innerHTML=""
    }
    });
    //==================================
    //============Draw Partitions=======
    //==================================

    groupIds = d3.set(nodes.map(n => { return n.partition; }))
                  .values()
                  .map( groupId =>  {
                    return { 
                    groupId : groupId,
                    partitionType: nodes.filter(n => { 
                      if (n.partition == groupId){
                        return n.type; 
                      }
                    })[0].type,
                    count : nodes.filter(n => { return n.partition == groupId; }).length
                    };
                  })

    // set the color scale
    colorPartition = d3.scaleOrdinal()
                      .domain(groupIds)
                      .range(d3.schemeDark2);

    //==================================
    //============Draw Links============
    //==================================

    svg.selectAll(".link")
        .data(newLinksFiltered)
        // .data(links)
        .enter().append("path")
        .filter(function(d){
          return (d.weight >= minEdgeWeight && d.weight <= maxEdgeWeight)
        })
        .attr("id",function(d,i){
          return "linkId_"+i
        })
        .classed('link', true)
        .style("stroke","#565656")
        .style("stroke-opacity","0.7")
        .style("stroke-width",1)
        .attr("marker-end", "none")

    //==================================
    //============Draw Nodes============
    //==================================
  
    const drag = d3
    .drag()
    .on("start", dragstarted)
    .on("drag", dragged)
    .on("end", dragended)

    node = svg.selectAll(".node")
        .data(nodes)
        .enter().append("path")
        //.attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; })
        .attr("d", d3.symbol()
        .size(function(d) { 
          if (d.type == "ClassNode"){
            return 200
          }
          else if (d.type == "MethodNode"){
            return 100
          }
          else if (d.type == "SQLTable"){
            // return d3.symbolCircle
            return 200
          }
        })
          .type(function(d) { 
            //return d3.symbolCircle
            if (d.type == "ClassNode"){
              return d3.symbolCircle
            }
            else if (d.type == "MethodNode"){
              return d3.symbolCircle
            }
            else if (d.type == "SQLTable"){
              // return d3.symbolCircle
              return d3.symbolDiamond
            }
        }))
        .classed("node",true)
        .attr("id",function(d,i){
          return "nodeId_"+i
        })
        // SOLUTION: add the class attribute
        .attr("class", "node")
          //.append("circle")
        // .attr("r", d=>{
        //   if (d.isMethod == true){
        //     return 4
        //   }
        //   else{
        //     return 10
        //   }
        // })
        .style("fill", function(d) {
            // return colors(d.parent && d.parent.name);
            return colorPartition(d.partition)
            // return "#888888"
        })

        .style("stroke", "#000")
        .on("mouseover",function(d){
            Tooltip.style("opacity", 1)
        
            Tooltip.style("display","block")
        
              svg.selectAll(".link")
                .filter(function(l) { 
                  return l.source.name === d.name|| l.target.name=== d.name; 
                })
                .classed("highlight", true);
        
              svg.selectAll(".link")
                .filter(function(l) { return l.source.name != d.name && l.target.name != d.name; })
                .classed("downlight", true);
        
              svg.selectAll(".node")
                .classed("downlight", true)
                .classed("highlight", false)
                .each(function(n) {
                    for (let index = 0; index < newLinks.length; index++) {  //loop through links
                        const element = newLinks[index];
                        if ( (element.source.name === d.name && element.target.name=== n.name) ||  //source of selected node connects to target of other node
                            (element.target.name === d.name && element.source.name === n.name) //target of selected node connects to source of other node
                          ) {  //related nodes
                            d3.select(this).classed("highlight", true);
                            d3.select(this).classed("downlight", false);
                        }
                    }
                })    
            //node that is selected
            svg.selectAll(".node")
            .filter(function(n) { return n.name === d.name})
            .classed("highlight", true)
            .classed("downlight", false)
        })
        .on("mousemove",function(node){
          var mouse = d3.mouse(svg.node()).map(function(d) { return parseInt(d); });


            // Tooltip
            //   .style("left",d3.event.pageX + 10 +"px")
            //   .style("top", d3.event.pageY +10+"px")
            //   .html("<br> Name: " + node.name + "<br> Entity Type: " + "<br> Business Entity: " + node.partition)
            if (node.children){ //class
              Tooltip
              .style("left",d3.event.pageX + 10 +"px")
              .style("top", d3.event.pageY + 10 +"px")
              .html("<br> Class name: " + node.name + "<br> Partition: " + node.partition)
            }
            else{ //method
              Tooltip
              .style("left",mouse[0] + 10 +"px")
              .style("top", mouse[1] +10+"px")
              .html("<br> Method name: " + node.name + "<br> Class: " + node.parent.name + "<br> Partition: " + node.partition)
            }
    
       })
        .on("mouseout",function(node){
          svg.selectAll(".link")
          .classed("highlight downlight", false);

          svg.selectAll(".node")
              .classed("highlight downlight", false)
      
          //remove tooltip svg since it blocks node interactions
          d3.selectAll("#tipDiv").remove()
      
          Tooltip.style("display","none")
        })
        .on('contextmenu', (node) => { //right click 
          d3.event.preventDefault();
          if (node.type != "SQLTable"){ //only allow right click on code nodes
            if (node.isMethod != true){ //if node is a class, expand 
              force.stop();
              expand(node);

              force = d3.forceSimulation(nodes)
                        .force("x", d3.forceX(d => {
                          //return 0
                          var deltaX = Math.random() //returns random number between 0 and 1
                          var partitionNames=[]
                          groupIds.forEach(function(partition){
                            partitionNames.push(partition.groupId)
                          })
                          var partitionNum= partitionNames.indexOf(String(d.partition))
                          if (partitionNum != -1){
                            return (width /(numPartitions+1) * partitionNum)+ deltaX
                          }
                          else{
                            return (width / (numPartitions+1)) + deltaX
                          }
                        }).strength(0))
                        .force("charge", d3.forceManyBody().distanceMin(10).distanceMax(15))

              setup("expandNodes");
              makePartitions()

              force.nodes(nodes); 

              force.force("link",d3.forceLink(newLinks).id(function(d) { 
                            return d.name; 
                          }).distance(5).strength(0))
                    .force("link").links(newLinks).strength(0);
              
              force.restart();

            }
            else{ //if node is a method, collapse
              force.stop();
              collapse(node);
              setup("collapseNodes");
              makePartitions()

              // SOLUTION: reset alpha, for the simulation to actually run again
              if ( force.alpha() < 0.05 ) {
                  force.alpha(0.05);
              }
              force.restart();
            }
          }
        })

   node.call(drag)

    var partitionBeforeNodeDrag
    var partitionBeforeNodeDragX
    var partitionBeforeNodeDragY
    var partitionBeforeNodeDragWidth
    var partitionBeforeNodeDragHeight

    //drag nodes
    function dragstarted(d) {
    if (!d3.event.active) force.alphaTarget(0.3).restart();
    d.fx = d.x;
    d.fy = d.y;

    var thisPartition= d.partition

    partitionBeforeNodeDragX = d3.selectAll('rect')
                      .filter(function(d) { return d.groupId == thisPartition})
                      .attr("x")

    partitionBeforeNodeDragY = d3.selectAll('rect')
                    .filter(function(d) { return d.groupId == thisPartition})
                    .attr("y")

    partitionBeforeNodeDragWidth = d3.selectAll('rect')
                                      .filter(function(d) { return d.groupId == thisPartition})
                                      .attr("width")

    partitionBeforeNodeDragWidth = d3.selectAll('rect')
                                      .filter(function(d) { return d.groupId == thisPartition})
                                      .attr("height")
    }

    function dragged(d) {
      //flag to differentiate between dragged and clicked
      isDragged = 1

      d.fx = d3.event.x;
      d.fy = d3.event.y;

      //fix_nodes(d);
      svg.selectAll('.partitionLabel').remove()
    }

    function dragended(this_node) {
      this_node.x = d3.event.x;
      this_node.y = d3.event.y;
      //flag to differentiate between drag and click event
      if (isDragged == 1) {
        node.each(function(d) {
          if (this_node == d) {  //found dragged node
            var foundPartition = 0
            d3.selectAll('rect').each(function(rect) {
              //find which rectangle partition we want to move it to
              var x1= parseFloat(d3.select(this).attr("x")) + parseFloat(d3.select(this).attr("width"))
              var y1= parseFloat(d3.select(this).attr("y")) + parseFloat(d3.select(this).attr("height"))
              
              if ((this_node.x > d3.select(this).attr("x")) && (this_node.x < x1) && (this_node.y > d3.select(this).attr("y")) && (this_node.y < y1)){

                var oldPartition= d.partition
                var newPartitionName = d3.select(this).attr("id")
                var newPartitionType
                groupIds.forEach(function(partition){
                  if (partition.groupId ==newPartitionName){
                    newPartitionType = partition.partitionType
                  }
                })
                if (d.type=="ClassNode" && newPartitionType=="ClassNode"){
                  foundPartition = 1
                }
                else if (d.type=="MethodNode" && newPartitionType=="ClassNode"){
                  foundPartition = 1
                }
                else if (d.type=="SQLTable" && newPartitionType=="SQLTable"){                  
                  foundPartition = 1
                }
                else{ //do not drag node
                  console.log("else")
                  foundPartition="doNotDrag"
                }

                if (foundPartition == 1) {
                  d.partition=newPartitionName //destination partition

                  if (d.children) {//if class,
                    //change all children's partitions to this partition
                    d.children.forEach(function(childNode){
                      childNode.partition = newPartitionName
                    })
                  }
                  else{ //if method
                    var parentNode= d.parent
                    var methodPartitions=[]
                    parentNode.children.forEach(function(childNode){
                      methodPartitions.push(childNode.partition) //get all method partitions
                    })
                    //find most frequent method partition in array
                    var mf = 1;
                    var m = 0;
                    var item;
                    var arr1= methodPartitions
  
                    if (arr1.length > 1){
                      for (var i=0; i<arr1.length; i++){
                        for (var j=i; j<arr1.length; j++) {
                          if (arr1[i] == arr1[j]) m++;
                          if (mf<=m){
                            mf=m; 
                            item = arr1[i];
                          }
                        }
                        m=0;
                      }
                      parentNode.partition = item //reset partition for class
                    }
                    else{
                      parentNode.partition = methodPartitions[0] //reset partition for class
                    }
                  }
                  var partitionCount = {}
                  node.each(function(d) {
                    if (!partitionCount[d.partition]){
                      partitionCount[d.partition]= 1
                    }
                    else{
                      partitionCount[d.partition]= partitionCount[d.partition]+1
                    }
                  })
  
                  if (newPartitionName != oldPartition){
                    //if old partition is empty, remove it from groupIds
                    if (partitionCount[oldPartition] == 0){
                      groupIds = groupIds.filter(function(item) {
                        return item.groupId !== oldPartition
                      })
                    }
                  }
                } 
              makePartitions() //recreate partitions
            }
          })
            //==================================================================
            //============If node is not inside existing partition=========
            //==================================================================
            if (foundPartition == 0){
              //if a node is being dragged too far from partition
              //create new partition for that node
              var minX = partitionBeforeNodeDragX
              var maxX = partitionBeforeNodeDragWidth
              var minY = partitionBeforeNodeDragY
              var maxY = partitionBeforeNodeDragHeight
          
              if ((this_node.x < minX - 30) || (this_node.x > maxX + 30) || (this_node.y < minY - 30) || (this_node.y > maxY + 30) ){
                var oldPartition = this_node.partition
                if (this_node.type=="SQLTable"){
                  var newPartitionName = "untitledDatabase"+ (groupIds.length + 1)
                  var partitionType="SQLTable"
                }
                else if (this_node.type=="ClassNode"){
                  var newPartitionName = "untitledPartition"+ (groupIds.length + 1)
                  var partitionType="ClassNode"
                }
                else if (this_node.type=="MethodNode"){
                  var newPartitionName = "untitledPartition"+ (groupIds.length + 1)
                  var partitionType="ClassNode"
                }
                this_node.partition= newPartitionName
                groupIds.push({"groupId":newPartitionName, "partitionType":partitionType})
                //move all children to this new partition
                if (d.children) {//if class,
                  //change all children's partitions to this partition
                  d.children.forEach(function(childNode){
                    console.log(childNode)
                    childNode.partition = newPartitionName
                  })
                }
                else{ //if method
                  var parentNode= d.parent
                  var methodPartitions=[]
                  parentNode.children.forEach(function(childNode){
                    methodPartitions.push(childNode.partition) //get all method partitions
                  })
                  //find most frequent method partition in array
                  var mf = 1;
                  var m = 0;
                  var item;
                  var arr1= methodPartitions

                  if (arr1.length > 1){
                    for (var i=0; i<arr1.length; i++){
                      for (var j=i; j<arr1.length; j++) {
                        if (arr1[i] == arr1[j]) m++;
                        if (mf<=m){
                          mf=m; 
                          item = arr1[i];
                        }
                      }
                      m=0;
                    }
                    parentNode.partition = item //reset partition for class
                  }
                  else{
                    parentNode.partition = methodPartitions[0] //reset partition for class
                  }
                }

              }
              var partitionCount = {}
              node.each(function(d) {
                if (!partitionCount[d.partition]){
                  partitionCount[d.partition]= 1
                }
                else{
                  partitionCount[d.partition]= partitionCount[d.partition]+1
                }
              })
              //svg.selectAll('rect').remove()
              //if old partition is empty, remove it from groupIds
              if (newPartitionName != oldPartition){
                //if old partition is empty, remove it from groupIds
                if (partitionCount[oldPartition] == 0){
                  groupIds = groupIds.filter(function(item) {
                    return item.groupId !== oldPartition
                  })
                }
              }
              makePartitions()

            }
          }
        })
        movedNodes.forEach(function(movedNode){
          if (movedNode.name != this_node.name){
            movedNodes.push(this_node)
          }
        })
        isDragged = 0
      }
      else{ //click
            //unclick all partitions
          svg.selectAll(".partitionRect")
          .classed("partitionClicked", false)
          .classed("partitionNotClicked", true)      

          //first set all nodes and links to not clicked to avoid duplicate classes
          svg.selectAll(".link")
          .classed("clicked notClicked", false);

          svg.selectAll(".node")
              .classed("clicked notClicked", false)

          Tooltip
            .style("opacity", 1)
            
          Tooltip.style("display","block")


          svg.selectAll(".link")
              .filter(function(l) { 
                return l.source.name === this_node.name || l.target.name === this_node.name; 
              })
              .classed("clicked", true);

          svg.selectAll(".link")
            .filter(function(l) { return l.source.named != this_node.name && l.target.name != this_node.name; })
            .classed("notClicked", true);

          //node that is selected
          svg.selectAll(".node")
            .filter(function(n) { return n.name === this_node.name })
            .classed("clicked", true)
            .classed("notClicked", false)

          //populate side menu
          var nodeChildren = this_node.children
          if (nodeChildren){ //class
            openNav("class",this_node)
          }
          else{ //method
            openNav("method",this_node)
          }
      }
} 

svg.selectAll('.node').filter((d,i)=> d.expanded === true).remove();  //remove expanded nodes from display
svg.selectAll('.link').filter((d,i)=> d.source.expanded == true).remove();   //remove any links touching expanded nodes
svg.selectAll('.link').filter((d,i)=> d.target.expanded == true).remove(); 
svg.selectAll('.link').filter((d,i)=> d.expanded === true).remove(); 

//==================================
//==========Create Simulation=======
//==================================

force.nodes(nodes); 

force.force("link",d3.forceLink(newLinks).id(function(d) { 
              return d.uid; 
            }).distance(100).strength(0))
     .force("link").links(newLinks).strength(0);
     

var nodetext = svg.selectAll("nodeLabel")
                  .data(nodes)
                  .enter()
                  .append("text")
                  .attr("class", "nodeLabel")
                  .style("font-size", "8px")
                  .style("display","none")
                  
//==============================================
//====================Tooltip===================
//==============================================

// create a tooltip
// var Tooltip = d3.selectAll(".graphSVG")
var Tooltip = d3.selectAll(".container-right")
              .append("div")
              .attr("class", "tooltip")
              .style("background-color", "rgba(255,255,255,1.0)")
              .style("border", "solid")
              .style("border-width", "1px")
              .style("border-radius", "5px")
              .style("padding", "5px")

//======================================
//===========Drag Partition=============
//======================================
var offsetX
var offsetY

var dragHandler = d3.drag()
  .on("start",function(){
      var currPartition=  d3.select(this)

      offsetX =  d3.event.x - currPartition.attr("x") 
      offsetY=  d3.event.y - currPartition.attr("y") 

      svg.selectAll(".node")
        .filter(function(n) { 
          if (n.partition ==  currPartition.attr("id")){
          }
          return n.partition ==  currPartition.attr("id")
        })
        .each(function(n) {
          n.startX = d3.event.x;
          n.startY = d3.event.y
          n.offsetX = d3.event.x - n.x
          n.offsetY = d3.event.y - n.y
        })
  })
  .on("drag", function (d) {
      var currPartition=  d3.select(this)

      var nodesToDrag = svg.selectAll(".node")
        .filter(function(n) { 
          if (n.partition ==  currPartition.attr("id")){
          }
          return n.partition ==  currPartition.attr("id")
        })
        // .attr("transform", "translate(20,0)")
        .each(function(n) {
          var xDist = d3.event.x - n.startX
          var yDist = d3.event.y - n.startY

          // Update the position with the delta x and y applied by the drag:
          n.x += d3.event.dx;
          n.y += d3.event.dy

        // Apply the translation to the shape:
          d3.select(this).attr("transform", "translate(" + n.x + "," + n.y + ")");
          // d3.select(this).attr("cx",d3.event.x - n.offsetX)
          // d3.select(this).attr("cy",d3.event.y - n.offsetY)
        })

      //move current partititon
      //offset to avoid prevent moving center to where the mouse is
      d3.select(this).attr("x", d3.event.x - offsetX)
      d3.select(this).attr("y", d3.event.y - offsetY)

  })
  .on("end", function () {
    var currPartition=  d3.select(this)
    //update n.x and n.y
  })

svg.selectAll('.rect_placeholder')
  .append("text")
  .classed("partitionLabel",true)
  .attr("fill",d=>{
    return colorPartition(d.groupId)
    // return "#888888"
})

function ticked(){
  //generate equidistant quadratic curves
  function link_arc(d) {
    // draw line for 1st link
    if (d.linknum == 1) {
        return 'L';
    }
    else {
        let sx = d.source.x;
        let sy = d.source.y;
        let tx = d.target.x;
        let ty = d.target.y;

        let cd = 15;  // distance b/w curve paths

        let cx = (sx + tx) / 2;         // find middle of source and target
        let cy = (sy + ty) / 2;
        
        var angle = Math.atan2(ty - sy, tx - sx);        // find angle of line b/w source and target

        var c_angle = angle + 1.5708;         // add radian equivalent of 90 degree

        // draw odd and even curves either side of line
        if (d.linknum & 1) {
            return 'Q ' + (cx - ((d.linknum - 1) * cd * Math.cos(c_angle))) + ',' + (cy - ((d.linknum - 1) * cd * Math.sin(c_angle))) + ' ';
        }
        else {
            return 'Q ' + (cx + (d.linknum * cd * Math.cos(c_angle))) + ',' + (cy + (d.linknum * cd * Math.sin(c_angle))) + ' ';
        }
    }
  }

  function noClassLinks(link) {
    return link.source.name != link.target.name
  }
 
  var newLinksFiltered2 = newLinksFiltered.filter(noClassLinks)

  svg.selectAll(".link")
      .attr("d", function(d) { 
        let dx = d.target.x - d.source.x,
            dy = d.target.y - d.source.y
            return 'M' + d.source.x + ',' + d.source.y + link_arc(d) + d.target.x + ',' + d.target.y
      })
      .style("stroke-width",1)

  svg.selectAll(".link")
      .data(newLinksFiltered2)
      .style("stroke-opacity",d=>{
        return 0.7
      })
      .style("stroke-width",1)
      .attr("d", function(d) { 
        var pl = this.getTotalLength() //get length of link
        var r=22/2
        var m = this.getPointAtLength(pl - r);
        return 'M' + d.source.x + ',' + d.source.y + link_arc(d) + m.x + ',' + m.y
      })
      .each(function(d) {
        var thisColor = linkColors("write")
        d3.select(this)
            .style("stroke", thisColor)
            .attr("marker-end", marker(thisColor))
      });

  svg.selectAll(".node")
    .attr("transform", function(d) { 
        d.fixed=true; 
        //bind position of node to stay within svg
        d.x = Math.max(10, Math.min(width - 10, d.x)); 
        d.y = Math.max(10, Math.min(height - 10, d.y)); 
        return "translate(" + d.x + "," + d.y + ")"; 
    })
    .style("fill", function(d) { 
      return colorPartition(d.partition) 
      // return "#888888"
    })

  svg.selectAll('.node').raise()

  //labels for nodes
  svg.selectAll(".nodeLabel")
    .style("fill","#000")
    .style("font-size", "8px")
    .text(function(d) { 
      return d.name
    })
    .attr("transform", function(d) { 
      d.fixed=true; 
      //bind position of node to stay within svg
      d.x = Math.max(10, Math.min(width-10, d.x)); 
      d.y = Math.max(10, Math.min(height - 10, d.y)); 
      return "translate(" + (d.x + 10)+"," + d.y + ")"; 
  })

}

function fix_nodes() {
  // simulation.stop()
  node.each(function(d) {
    d.fx = d.x;
    d.fy = d.y;
  })

}

force.on("tick", function(e) {
  ticked()
  })

force
  .on("end", d=>{
    console.log("simulation ended")
    fix_nodes()
    makePartitions()
    //createInitialPartitions()
  })

function polygonGenerator(groupId) {
  var node_coords = node
    .filter(function(d) { 
      return d.partition == groupId; 
    })
    .data()
    .map(function(d) { 
      return [d.x, d.y]; 
    });

  var minX=1000
  var minY=1000
  var maxY=-1000
  var maxX=-1000
  node_coords.forEach(point => {
    //min x, min y
    if (point[0] < minX){
      minX = point[0]
    }
    if (point[1] < minY){
      minY = point[1]
    }
    if (point[1] > maxY){
      maxY = point[1]
    }
    if (point[0] > maxX){
      maxX = point[0]
    }
  })
  var extraPoint1=[minX,minY]
  var extraPoint2=[minX,maxY]
  var extraPoint3=[maxX,maxY]

  if (node_coords.length < 1){ //if there are no points left in this partition
    //remove partition
    node_coords=[]
    node_coords.push([-20,-20])
    node_coords.push([-20,-20])
    node_coords.push([-20,-20])
  }
  else if (node_coords.length < 2){ //if there are less than 2 points in this partition
    node_coords.push(extraPoint1)
    node_coords.push(extraPoint2)
  }
  else if (node_coords.length < 3){ //if there are less than 3 points in this partition
    node_coords.push(extraPoint1)
  }
  return d3.polygonHull(node_coords);
};


//==========================================
//==========Update partitions===============
//==========================================
function makePartitions() {
  //svg.selectAll('rect').remove()
  svg.selectAll('.rect_placeholder').remove()

  var partitionRects = svg.selectAll('rect')
                          .data(groupIds, function(d) { return +d; })
                          .enter()
                          .append('g')
                          .attr('class', 'rect_placeholder')
                          .attr('id',d=>{
                            return 'rectPlaceholder'+d.groupId
                          })
                          .append('rect')
                          .classed("partitionRect",true)
                          .attr("id",d=>{
                            return d.groupId
                          })
                          .attr('stroke', d=>{
                            return colorPartition(d.groupId)
                            // return "#888888"
                          })
                          .attr('fill',  d=>{
                            return colorPartition(d.groupId)
                            // return "white"
                          })
                          .style('fill-opacity', 0.2)
                          .attr("width",function(d) {
                            var polygon = polygonGenerator(d.groupId)
                            var x0=polygon[0][0]
                            var x1=polygon[0][0]
                            polygon.forEach(point =>{
                              if (point[0] < x0){x0 = point[0]}
                              if (point[0] > x1){x1 = point[0]}
                            })
                            return (x1-x0)+100
                          })
                          .attr("height",function(d) {
                            var polygon = polygonGenerator(d.groupId)
                    
                            var y0=polygon[0][1]
                            var y1=polygon[0][1]
                            polygon.forEach(point =>{
                              if (point[1] < y0){y0 = point[1]}
                              if (point[1] > y1){y1 = point[1]}
                            })
                    
                            return (y1-y0)+100
                          })
                          .attr("x",function(d) {
                            var polygon = polygonGenerator(d.groupId)
                            var x0=polygon[0][0]
                            polygon.forEach(point =>{
                              if (point[0] < x0){x0 = point[0]}
                            })
                    
                            return x0-50
                          })
                          .attr("y",function(d) {
                            var polygon = polygonGenerator(d.groupId)
                            var y0=polygon[0][1]
                            polygon.forEach(point =>{
                              if (point[1] < y0){y0 = point[1]}
                            })
                            return y0-50
                          })

  groupIds.forEach(p => {

    d3.selectAll('rect')
      .filter(function(d) { return d == p.groupId;})
      .attr('pathId',"path"+p.groupId)
      .attr('transform', 'scale(1) translate(0,0)')
      .style('fill-opacity', 0.2)
      .attr('stroke', d=>{
        // return "#888888"
        return colorPartition(d)
      })
      .attr('fill',  d=>{
        return colorPartition(d)
        // return "white"
      })
      .attr("width",function(d) {
          var polygon = polygonGenerator(d)
          var x0=polygon[0][0]
          var x1=polygon[0][0]
          polygon.forEach(point =>{
            if (point[0] < x0){x0 = point[0]}
            if (point[0] > x1){x1 = point[0]}
          })
          return (x1-x0)+100
      })
      .attr("height",function(d) {
        var polygon = polygonGenerator(d)

        var y0=polygon[0][1]
        var y1=polygon[0][1]
        polygon.forEach(point =>{
          if (point[1] < y0){y0 = point[1]}
          if (point[1] > y1){y1 = point[1]}
        })

        return (y1-y0)+100
      })
      .attr("x",function(d) {
        var polygon = polygonGenerator(d)
        var x0=polygon[0][0]
        polygon.forEach(point =>{
          if (point[0] < x0){x0 = point[0]}
        })

        return x0-50
      })
      .attr("y",function(d) {
        var polygon = polygonGenerator(d)
        var y0=polygon[0][1]
        polygon.forEach(point =>{
          if (point[1] < y0){y0 = point[1]}
        })
        return y0-50
      })
      
    //svg.selectAll(".rect_placeholder").exit().remove()
    svg.selectAll('.rect_placeholder').selectAll('.partitionLabel').remove()

    var partitionLabel = svg.selectAll('.partitionLabel')
      .data(groupIds, function(d) { return +d; })
      .enter()
      svg.selectAll(".rect_placeholder")
        .append("text")
        .classed("partitionLabel",true)
        .attr("fill",d=>{
          return colorPartition(d.groupId)
          // return "white"
        })
        .attr("x",function(d) {
          var polygon = polygonGenerator(d.groupId)
          var x0=polygon[0][0]
          polygon.forEach(point =>{
            if (point[0] < x0){x0 = point[0]}
          })

          return x0-50
        })
        .attr("y",function(d) {
          var polygon = polygonGenerator(d.groupId)
          var y0=polygon[0][1]
          polygon.forEach(point =>{
            if (point[1] < y0){y0 = point[1]}
          })
          return y0-55
        })
        .text(function(d){
          return d.groupId
        })
        .style("font-size","14px")
  })

  svg.selectAll('.node').raise()

  //==============================================
  //========Partition Mouse Events================
  //==============================================

  svg.selectAll('rect')
  .on("mouseover",d=>{
    //node that is selected
    svg.selectAll(".partitionRect")
    .filter(function(n) { 
      return n === d
    })
    .classed("partitionNotClicked", false)
    .classed("partitionHovered", true)
    .classed("partitionNotHovered", false)
  })
  .on("mouseout",d=>{
    svg.selectAll(".partitionRect")
    .classed("partitionHovered", false)
    .classed("partitionNotHovered", true)
  })
  .on("click",d=>{
    //node unclicked
    svg.selectAll(".node").classed("clicked",false)
    svg.selectAll(".node").classed("notClicked",false)
    svg.selectAll(".link").classed("clicked",false)
    svg.selectAll(".link").classed("notClicked",false)

    //unclick all other partitions
    svg.selectAll(".partitionRect")
          .classed("partitionClicked", false)
          .classed("partitionNotClicked", false)

    //partition clicked
    // d3.event.stopImmediatePropagation() //stops over concurrent events from happening like mouseover

    svg.selectAll(".partitionRect")
    .filter(function(n) { 
      return n === d
    })
    .classed("partitionClicked", true)
    .classed("partitionNotClicked", false)

    //set partition name placeholder
    document.getElementById("navTitle").placeholder = d

    //open and populate nav with partition info
    openNav("partition",d)
  })
  //ticked()
}
} //end of make
//dragHandler(svg.selectAll(".partitionRect"));


function collapse(methodNode) {
  console.log(`Collapse ${methodNode.name}, expanded: ${methodNode.expanded}`);

  if ( methodNode.isMethod == true ) {
  //get parent node, find it in existing array and change expanded to false
  //=================================
  //=========Collapse Nodes=========
  //=================================
  var parentNode= methodNode.parent
  nodes.forEach(function(node) {
      if (node == parentNode){ //if node is parent node
        node.expanded = false
      }
      if (node.parent == parentNode){ //if node is another method within that class
        nodes = nodes.filter(function(n) { return n !== node })
      }
  })
  }
  //reset graph
  d3.selectAll(".node").remove()
  d3.selectAll(".link").remove()
  d3.selectAll(".tooltip").style("display","none")

}

function expand(node) {
  function fix_nodes(node) {
    // simulation.stop()
    node.each(function(d) {
      d.fx = d.x;
      d.fy = d.y;
    })
  }
  var newLinks
  console.log(`Expand ${node.name}, expanded: ${node.expanded}`);
  if ( ! node.expanded ) {
    (node.children || []).forEach(function(childNode) {
        console.log(`  - child ${childNode.name}`);
        childNode.parent = node;
        //if method is in the same partition
        // pop up around the "parent" node
        // childNode.x = node.x;
        // childNode.y = node.y;
        if (childNode.partition == node.partition){ 
          childNode.x = node.x;
          childNode.y = node.y;
        }
        // else pop up around a node of the corresponding partition
        else{
          //find node from other partition
          nodes.forEach(function(n){
            if (!node.expanded){
              if (n.partition == childNode.partition){
                childNode.x = n.x;
                childNode.y = n.y;
              }
            }
          })
        }

        childNode.isMethod = true
        nodes.push(childNode);  // add the node, and its link to the "parent"
        //fix_nodes(node)
    });
    node.isMethod = false;
    node.expanded = true;
    //links = Object.assign([], newLinks)
    //reset graph
    d3.selectAll(".node").remove()
    d3.selectAll(".link").remove()
    d3.selectAll(".tooltip").style("display","none")
  }
}

function forceCluster() {
  const strength = 0.2;
  //let nodes;

  function force(alpha) {

    const centroids = d3.rollup(nodes, centroid, function(d){
      return d.partition
    });
    const l = alpha * strength;
    for (const d of nodes) {
      const {
        x: cx,
        y: cy
      } = centroids.get(d.partition);
      d.vx -= (d.x - cx) * l;
      d.vy -= (d.y - cy) * l;

    }
  }
  force.initialize = _ => nodes = _;

  return force;
}


function forceCollide() {
const alpha = 0.4; // fixed for greater rigidity!
const padding1 = 8; // separation between same-color nodes
const padding2 = 8; // separation between different-color nodes
let nodes;
let maxRadius;

function force() {
const quadtree = d3.quadtree(nodes, d => d.x, d => d.y);
for (const d of nodes) {
  const r = d.r + maxRadius;
  const nx1 = d.x - r,
    ny1 = d.y - r;
  const nx2 = d.x + r,
    ny2 = d.y + r;
  quadtree.visit((q, x1, y1, x2, y2) => {
    if (!q.length)
      do {
        if (q.data !== d) {
          const r = d.r + q.data.r + (d.partition === q.data.partition ? padding1 : padding2);
          let x = d.x - q.data.x,
            y = d.y - q.data.y,
            l = Math.hypot(x, y);
          if (l < r) {
            l = (l - r) / l * alpha;
            d.x -= x *= l, d.y -= y *= l;
            q.data.x += x, q.data.y += y;
          }
        }
      } while (q = q.next);
    return x1 > nx2 || x2 < nx1 || y1 > ny2 || y2 < ny1;
  });
}
}

force.initialize = _ => maxRadius = d3.max(nodes = _, d => d.r) + Math.max(padding1, padding2);

return force;
}
function centroid(nodes) {
let x = 0;
let y = 0;
let z = 0;
for (const d of nodes) {
let k = d.r ** 2;
x += d.x * k;
y += d.y * k;
z += k;
}
return {
x: x / z,
y: y / z
};
}

function generateUUID() {
var d = new Date().getTime();
var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
var r = (d + Math.random() * 16) % 16 | 0;
d = Math.floor(d / 16);
return (c == 'x' ? r : (r & 0x3 | 0x8)).toString(16);
});
return uuid;
};
