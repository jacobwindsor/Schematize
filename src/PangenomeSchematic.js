import React from 'react';

class PangenomeSchematic extends React.Component {
	constructor(props) {
		/*Only plain objects will be made observable. For non-plain objects it is considered the
		 responsibility of the constructor to initialize the observable properties. Either use
		 the @observable annotation or the extendObservable function.*/
		super(props);
		this.readFile(this.props.store.jsonName);
    }
	componentDidUpdate() {
		this.processArray();
		// console.log("#components: " + this.components);
	}
	readFile(jsonFilename) {
	    console.log("Reading", jsonFilename);
		this.getJSON('test_data/' + jsonFilename, this.loadJSON.bind(this));
	}
	getJSON(filepath, callback) {
		var xobj = new XMLHttpRequest();
		xobj.overrideMimeType("application/json");
        // not async because there's nothing to render without the file
		xobj.open('GET', process.env.PUBLIC_URL + filepath, false);
		xobj.onreadystatechange = function () {
			if (xobj.readyState === 4 && xobj.status === 200) {
				// Required use of an anonymous callback as .open will NOT return a value but simply returns undefined in asynchronous mode
				callback(xobj.responseText);
			}
		};
		xobj.send(null);
	}
	loadJSON(data){
		this.jsonData = JSON.parse(data);
		this.pathNames = this.jsonData.path_names;
	}

	processArray() {
		let [beginBin, endBin] = [this.props.store.beginBin, this.props.store.endBin];
	    if(this.jsonData.json_version !== 8){
	        throw MediaError("Wrong Data JSON version: was expecting version 8, got " + this.jsonData.json_version + ".  " +
            "This version introduced first and last nucleotide for each bin/path.  " + // KEEP THIS UP TO DATE!
            "Using a mismatched test_data file and renderer will cause unpredictable behavior," +
            " instead generate a new test_data file using github.com/graph-genome/component_segmentation.")
        }
		console.log("Parsing components ", beginBin, " - ", endBin);

		// while(wrongFile){
		// 	getNextFileName()
		// }
		// let test_data = getJSONData(filename);
		var componentArray = [];
		var offsetLength = 0;
		for (var component of this.jsonData.components) {
			if(component.last_bin >= beginBin){
				var componentItem = new Component(component, offsetLength);
				offsetLength += componentItem.arrivals.length + componentItem.departures.length-1;
				componentArray.push(componentItem);
				if(component.first_bin > endBin && componentArray.length > 1){break}
			}
		}
		this.components = componentArray;
	}
}

class Component {
	constructor(component, offsetLength) {
		this.offset = offsetLength;
		this.firstBin = component.first_bin;
		this.lastBin = component.last_bin;
		this.arrivals = [];
		for (let arrival of component.arrivals) {
			this.arrivals.push(new LinkColumn(arrival))
		}
		this.departures = [];
		for (let departure of component.departures) { //don't slice off adjacent here
			this.departures.push(new LinkColumn(departure))
		}
		// we do not know the x val for this component, yet
		this.x = 0;
		// deep copy of occupants
		this.occupants = Array.from(component.occupants);
		this.matrix = Array.from(component.matrix);
		this.num_bin = this.lastBin - this.firstBin + 1;
	}
	firstDepartureColumn() {
		return (this.num_bin) + this.arrivals.length;
	}
}

class LinkColumn {
	constructor(linkColumn) {
		this.upstream = linkColumn.upstream;
		this.downstream = linkColumn.downstream;
		this.participants = (linkColumn.participants);//new Set
		this.key = this.edgeToKey()
	}
	edgeToKey() {
		/**downstream and upstream are always in the same orientation regardless of if it is a
		 * departing LinkColumn or an arriving LinkColumn.**/
		return String(this.downstream).padStart(13, '0') + String(this.upstream).padStart(13, '0');
	};

}

export default PangenomeSchematic