import {render} from 'react-dom';
import {Layer, Stage} from 'react-konva';
import React, {Component} from 'react';

import './App.css';
import PangenomeSchematic from './PangenomeSchematic'
import ComponentRect from './ComponentRect'
import LinkColumn from './LinkColumn'
import LinkArrow from './LinkArrow'
import {calculateLinkCoordinates} from "./LinkRecord";

function stringToColor(linkColumn, highlightedLinkColumn) {
    let colorKey = (linkColumn.downstream + 1) * (linkColumn.upstream + 1);
    if (highlightedLinkColumn && colorKey
        === (highlightedLinkColumn.downstream + 1) * (highlightedLinkColumn.upstream + 1)) {
        return 'black';
    } else {
        return stringToColourSave(colorKey);
    }
}

const stringToColourSave = function(colorKey) {
    colorKey = colorKey.toString();
    let hash = 0;
    for (let i = 0; i < colorKey.length; i++) {
        hash = colorKey.charCodeAt(i) + ((hash << 5) - hash);
    }
    let colour = '#';
    for (let j = 0; j < 3; j++) {
        let value = (hash >> (j * 8)) & 0xFF;
        colour += ('00' + value.toString(16)).substr(-2);
    }
    return colour;
};

class App extends Component {
    layerRef = React.createRef();
    static defaultProps = {beginBin:2500,
        endBin:2700,
        binsPerPixel:6,
        paddingSize:2,
        leftOffset:10
    };
    constructor(props) {
        Object.assign(App.defaultProps, props);
        super(props);
        let schematic = new PangenomeSchematic(props);
        const sum = (accumulator, currentValue) => accumulator + currentValue;
        let actualWidth = this.props.leftOffset + schematic.components.map(component =>
            component.arrivals.length + component.departures.length + (component.lastBin - component.firstBin) + 1 + this.props.paddingSize
        ).reduce(sum) * this.props.binsPerPixel;
        console.log(actualWidth);
        // console.log(schematic.components);

        this.state = {
            schematize: schematic.components,
            pathNames: schematic.pathNames,
            topOffset: 400,
            pathsPerPixel: 1,
            actualWidth: actualWidth,
            highlightedLink: 0 // we will compare linkColumns
        };
        this.updateHighlightedNode = this.updateHighlightedNode.bind(this);

        let [links, top] =
            calculateLinkCoordinates(schematic.components, this.props.binsPerPixel, this.state.topOffset,
                this.leftXStart.bind(this));
        this.distanceSortedLinks = links;
        this.state.topOffset = top;
    };

    componentDidMount = () => {
        this.layerRef.current.getCanvas()._canvas.id = 'cnvs';
    };

    updateHighlightedNode = (linkRect) => {
        this.setState({highlightedLink: linkRect})
    };

    leftXStart(schematizeComponent, i) {
        return (schematizeComponent.firstBin - this.props.beginBin) + (i * this.props.paddingSize) + schematizeComponent.offset;
    }


    renderComponent(schematizeComponent, i) {
        return (
            <React.Fragment>
                <ComponentRect
                    item={schematizeComponent}
                    key={i}
                    x={this.state.schematize[i].x}
                    y={this.state.topOffset}
                    height={this.state.pathNames.length * this.state.pathsPerPixel}
                    width={(schematizeComponent.leftPadding() + schematizeComponent.departures.length) * this.props.binsPerPixel}
                />

                {schematizeComponent.arrivals.map(
                    (linkColumn, j) => {
                        let leftPad = 0;
                        return this.renderLinkColumn(schematizeComponent, i, leftPad, j, linkColumn);
                    }
                )}
                {schematizeComponent.departures.map(
                    (linkColumn, j) => {
                        let leftPad = schematizeComponent.leftPadding();
                        return this.renderLinkColumn(schematizeComponent, i, leftPad, j, linkColumn);
                    }
                )}
            </React.Fragment>
        )
    }

    renderLinkColumn(schematizeComponent, i, leftPadding, j, linkColumn) {
        let xCoordArrival = this.props.leftOffset + (this.leftXStart(schematizeComponent,i) + leftPadding + j) * this.props.binsPerPixel;
        let localColor = stringToColor(linkColumn, this.state.highlightedLink);
        return <LinkColumn
            key={"departure" + i + j}
            item={linkColumn}
            pathNames={this.state.pathNames}
            x={xCoordArrival}
            pathsPerPixel={this.state.pathsPerPixel}
            y={this.state.topOffset}
            width={this.props.binsPerPixel}
            color={localColor}
            updateHighlightedNode={this.updateHighlightedNode}
        />
    }

    renderLinks(link) {

        let [arrowXCoord, absDepartureX] = [link.xArrival, link.xDepart];
        // put in relative coordinates to arriving LinkColumn
        let departureX = absDepartureX - arrowXCoord + this.props.binsPerPixel/2;
        let arrX = 2;
        let turnDirection = (departureX < 0)? -1.5 : 1.5;
        const departOrigin = [departureX, 0];
        const departCorner = [departureX - turnDirection, -link.elevation + 2];
        let departTop = [departureX - (turnDirection*6), -link.elevation];
        let arriveTop = [arrX + turnDirection*6, -link.elevation];
        let arriveCorner = [arrX + turnDirection, -link.elevation + 2]; // 1.5 in from actual corner
        const arriveCornerEnd = [arrX, -5];
        let points = [
            departOrigin[0], departOrigin[1],
            departCorner[0], departCorner[1],
            departTop[0], departTop[1],
            arriveTop[0], arriveTop[1],
            arriveCorner[0], arriveCorner[1],
            arriveCornerEnd[0], arriveCornerEnd[1],
            arrX, 0];
        if (Math.abs(departureX) <= 12) { //Small distances, usually self loops
            points = [
                departOrigin[0], departOrigin[1],
                departCorner[0], departCorner[1],
                arriveCorner[0], arriveCorner[1],
                arrX, 0];
        }
        if(points.some(isNaN)){
            console.log(points);
        }
        return <LinkArrow
            key={"arrow" + link.linkColumn.edgeToKey()}
            x={arrowXCoord}
            y={this.state.topOffset - 5}
            points={points}
            width={this.props.binsPerPixel}
            color={stringToColor(link.linkColumn, this.state.highlightedLink)}
            updateHighlightedNode={this.updateHighlightedNode}
            item={link.linkColumn}
        />
    }

    render() {
        console.log("Start render");
        return (
            <React.Fragment>
                <Stage
                    width={this.state.actualWidth + 20}
                    height={this.state.topOffset + this.state.pathNames.length * this.state.pathsPerPixel}>
                    <Layer ref={this.layerRef}>
                        {this.state.schematize.map(
                            (schematizeComponent, i)=> {
                                return (
                                    <React.Fragment>
                                        {/*These two lines could be in separate for loops if you want control over ordering*/}
                                        {this.renderComponent(schematizeComponent, i)}
                                    </React.Fragment>
                                )
                            }
                        )}
                        {this.distanceSortedLinks.map(
                            (record) => {
                                return (<React.Fragment>
                                    {this.renderLinks(record)}
                                </React.Fragment>)
                            }
                        )}
                    </Layer>
                </Stage>
            </React.Fragment>
        );
    }

}

render(<App />, document.getElementById('root'));

export default App;
