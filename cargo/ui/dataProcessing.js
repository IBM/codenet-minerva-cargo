// truncate class names in json s.t. only the part after the last period is considered

function download(filename, text) {
    var element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
    element.setAttribute('download', filename);
  
    element.style.display = 'none';
    document.body.appendChild(element);
  
    element.click();
  
    document.body.removeChild(element);
  }
  

function loadData(){
    d3.json("data/partitions.json").then((d) => {
        d.nodes.forEach(function(node){
            var longItemName = node.name
            var listItems=longItemName.split(".")
            var itemName = listItems.pop()
            node.name=itemName
        })
        d.links.forEach(function(link){
            var longSourceName = link.source
            var listItemsSource=longSourceName.split(".")
            var sourceName = listItemsSource.pop()
            link.source=sourceName

            var longTargetName = link.target
            var listItemsTarget=longTargetName.split(".")
            var targetName = listItemsTarget.pop()
            link.target=targetName
        })


        //write to new json
        var json = JSON.stringify(d)
        console.log("json is ",json)
        // Start file download.
        download("hello.json",json);
    })  
}

loadData()