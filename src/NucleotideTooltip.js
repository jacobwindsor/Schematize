import React from 'react';
import MouseTooltip from 'react-sticky-mouse-tooltip';
import {Observer} from 'mobx-react';

export default class NucleotideTooltip extends React.Component {
    // state = {
    //     isMouseTooltipVisible: false,
    // };
    //
    // toggleMouseTooltip = () => {
    //     this.setState(prevState => ({ isMouseTooltipVisible: !prevState.isMouseTooltipVisible }));
    // };

    render() {
        return <MouseTooltip
            visible={true}
            offsetX={15}
            offsetY={-20}
            style={{'background':'white'}}>
                <Observer>{() => <span>{this.props.store.cellToolTipContent}</span>}</Observer>
        </MouseTooltip>;
    }
}