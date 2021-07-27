// powerbi.extensibility.utils.dataview
import { dataViewObjectsParser } from "powerbi-visuals-utils-dataviewutils";
import DataViewObjectsParser = dataViewObjectsParser.DataViewObjectsParser;

export interface measuresAxSettings {

    generalView: {
        opacity: number;
        fill: string;
        gradientColor: boolean;
        curvedLines: boolean;
        bgChart: string;
    };

    enableAxis: {
        show: boolean;
        fontSize: number;
        xAxis: boolean;
        xAxisTitle: string;
        yAxis1: boolean;
        yAxis1Title: string;
        yAxis1Proportion: number
        yAxis2: boolean;
        yAxis2Title: string;
        yAxis2Proportion: number;
        yAxis1ScaleYAxis2: boolean;
    };

    legend: {
        show: boolean;
        position: string;
        showTitle: boolean;
        titleText: string;
        labelColor: string;
        fontSize: number;
    }

    averageLine: {
        show: boolean;
        displayName: string;
        fill: string;
        showDataLabel: boolean;
    };
}
