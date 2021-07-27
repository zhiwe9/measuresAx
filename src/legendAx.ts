

import {
    event as d3Event,
    select as d3Select
} from "d3-selection";
import {
    scaleLinear,
    scaleBand,
    scaleOrdinal,
    scalePoint
} from "d3-scale";

type Selection<T1, T2 = T1> = d3.Selection<any, T1, any, T2>;
import ScaleLinear = d3.ScaleLinear;
const getEvent = () => require("d3-selection").event;

export class legendAx {

    private containerSvg: Selection<SVGElement>;


}