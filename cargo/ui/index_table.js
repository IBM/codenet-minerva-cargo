var nodes
var linkData
var links =[]
var groupIds
var numPartitions
var this_node

function loadData(){
    d3.json("data/partitions.json").then((d) => {
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

        var listPartitions= []
        groupIds.forEach(function(groupId){
            listPartitions.push(groupId.groupId)
        })
        console.log("listPartitions is ",listPartitions)
            
        //populate dropdown from side menu
        d3.selectAll("#myDropdown")
            .selectAll("a")
            .data(listPartitions)
            .enter()
            .append("option")
            .classed("partitionOption",true)
            .text(d=>{
                return d
            })
            
        setup(nodes,links, numPartitions);
      })  

}

function setup(nodes){
    d3.selectAll("tr").remove()

    var createTable = function(){
        for (var i = 0; i < nodes.length; i++) {
            var row = d3.select('tbody').append('tr');
            row.append('td').html(nodes[i].name);
            row.append('td').html(nodes[i].partition);
            row.append('td').html(nodes[i].type);
            row.append('td').html(nodes[i].children.length);
        }
    }
    //createTable();

    var row = d3.select('tbody')
                    .selectAll("tr")
                    .data(nodes)
                    .enter()
                    .append("tr")

    row
      .append("td")
      .text(d=>{
          return d.name
      })

    row
      .append("td")
      .text(d=>{
          return d.partition
      })

    row
        .append("td")
        .text(d=>{
            return d.type
        })

    row
        .append("td")
        .text(d=>{
            return d.children.length
        })

    //d3.selectAll('tr').style("background-color", "white")

    d3.selectAll('tr')
                    .on("mouseover", function(){
                        d3.select(this).style("background-color", "powderblue");
                    })
                    .on("mouseout", function(){
                        d3.select(this).style("background-color", "white");
                      })         
                    .on("click",d=>{
                        console.log('clicked')
                        console.log('d is ',d)
                        this_node = d
                        d3.selectAll("#className").text(d.name) 
                    })


    d3.selectAll('td').style("padding","15px")
    d3.selectAll('th').style("padding","15px")
    
}

loadData()

//============================================================
// ============Change partition from side menu================
//============================================================

// d3.selectAll('.dropbtn').on("click",d=>{
//     showDropdown()
// })

// function showDropdown() {
//     document.getElementById("myDropdown").classList.toggle("show");
// }
  
// Close the dropdown if the user clicks outside of it
// window.onclick = function(event) {
//     if (!event.target.matches('.dropbtn')) {
//         var dropdowns = document.getElementsByClassName("dropdown-content");
//         var i;
//         for (i = 0; i < dropdowns.length; i++) {
//         var openDropdown = dropdowns[i];
//         if (openDropdown.classList.contains('show')) {
//             openDropdown.classList.remove('show');
//         }
//         }
//     }
// }


d3.select("select")
    .on("change",function(d){
        var selected = d3.select("#myDropdown").node().value;
        console.log( selected );
        nodes.forEach(function(node){
            if (node.name == this_node.name){
                node.partition=selected
                setup(nodes,links, numPartitions);
            }
        })
    })
