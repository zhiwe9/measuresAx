import "./../style/visual.less";

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

import { axisBottom, axisLeft, axisRight } from "d3-axis";

import powerbiVisualsApi from "powerbi-visuals-api";
import powerbi = powerbiVisualsApi;

type Selection<T1, T2 = T1> = d3.Selection<any, T1, any, T2>;
import ScaleLinear = d3.ScaleLinear;
const getEvent = () => require("d3-selection").event;

// powerbi.visuals
import IViewport = powerbi.IViewport;
import DataViewCategoryColumn = powerbi.DataViewCategoryColumn;
import DataViewObjects = powerbi.DataViewObjects;
import EnumerateVisualObjectInstancesOptions = powerbi.EnumerateVisualObjectInstancesOptions;
import Fill = powerbi.Fill;
import ISandboxExtendedColorPalette = powerbi.extensibility.ISandboxExtendedColorPalette;
import ISelectionId = powerbi.visuals.ISelectionId;
import ISelectionManager = powerbi.extensibility.ISelectionManager;
import IVisual = powerbi.extensibility.IVisual;
import IVisualEventService = powerbi.extensibility.IVisualEventService;
import IVisualHost = powerbi.extensibility.visual.IVisualHost;
import PrimitiveValue = powerbi.PrimitiveValue;
import VisualObjectInstance = powerbi.VisualObjectInstance;
import VisualObjectInstanceEnumeration = powerbi.VisualObjectInstanceEnumeration;
import VisualTooltipDataItem = powerbi.extensibility.VisualTooltipDataItem;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import DataViewValueColumnGroup = powerbi.DataViewValueColumnGroup;

// powerbi.extensibility.utils
import { createTooltipServiceWrapper, TooltipEventArgs, ITooltipServiceWrapper } from "powerbi-visuals-utils-tooltiputils";
import { textMeasurementService as tms } from "powerbi-visuals-utils-formattingutils";
//import textMeasurementService = tms.textMeasurementService;

// powerbi.extensibility.utils.interactivity
import { interactivityBaseService as interactivityService, interactivitySelectionService } from "powerbi-visuals-utils-interactivityutils";
import appendClearCatcher = interactivityService.appendClearCatcher;
import IInteractiveBehavior = interactivityService.IInteractiveBehavior;
import IInteractivityService = interactivityService.IInteractivityService;
import IBehaviorOptions = interactivityService.IBehaviorOptions;
import BaseDataPoint = interactivityService.BaseDataPoint;
import createInteractivityService = interactivitySelectionService.createInteractivitySelectionService;
import SelectableDataPoint = interactivitySelectionService.SelectableDataPoint;

// powerbi.extensibility.utils.chart.legend
import { legend as LegendModule, legendInterfaces, OpacityLegendBehavior, axisInterfaces, axisScale, axis as AxisHelper } from "powerbi-visuals-utils-chartutils";
import ILegend = legendInterfaces.ILegend;
import LegendPosition = legendInterfaces.LegendPosition;
import LegendData = legendInterfaces.LegendData;
import createLegend = LegendModule.createLegend;
import LegendDataPoint = legendInterfaces.LegendDataPoint;

import { getValue, getCategoricalObjectValue, getSerieObjectValue, getTableObjectValue } from "./objectEnumerationUtility";
import { measuresAxSettings } from "./settings";
import { legendAx } from "./legendAx";
import { legendBehavior } from "./legendBehavior";

//import { group } from "d3";
import * as d3 from "d3";
import * as d3_shape from "d3-shape";
import { allowedNodeEnvironmentFlags } from "process";
//import { getLocalizedString } from "./localization/localizationHelper"

/**
 * Interface for measuresAxs viewmodel.
 *
 * @interface
 * @property {measuresAxDataPoint[]} dataPoints - Set of data points the visual will render.
 * @property {number} dataMax                 - Maximum data value in the set of data points.
 */

interface measuresAxViewModel {
    categories: string[];
    dataMax: number;
    dataMax2: number;
    xAxisTitle: string;
    yAxis1Title: string;
    yAxis2Title: string;

    settings: measuresAxSettings;
    legendData: LegendData;

    legendGroups: measuresAxLegendGroup[];
}

/**
 * Interface for measuresAx data points.
 *
 * @interface
 * @property {number} value             - Data value for point.
 * @property {string} category          - Corresponding category of data value.
 * @property {string} color             - Color corresponding to data point.
 * @property {ISelectionId} selectionId - Id assigned to data point for cross filtering
 *                                        and visual interaction.
 */

interface measuresAxDataCell {
    category: string;
    legend: string;
    color: string;
    format: string;
    yAxis1Value: number;
    rowSelectionId: ISelectionId;
}

export interface measuresAxLegendGroup extends interactivitySelectionService.SelectableDataPoint {
    displayName: string;
    color: string;
    legendSelectinId: ISelectionId;
    dataPoints: measuresAxDataCell[];
    yAxis1Max: number;
    AxisFlag: string;
}

export interface BaseBehaviorOptions<SelectableDataPointType extends BaseDataPoint> extends IBehaviorOptions<SelectableDataPointType> {

    /** d3 selection object of the main elements on the chart */
    elementsSelection: d3.Selection<any, SelectableDataPoint, any, any>;

    /** d3 selection object of some elements on backgroup, to hadle click of reset selection */
    clearCatcherSelection: d3.Selection<any, any, any, any>;
}
/**
 * Interface for measuresAx settings.
 *
 * @interface
 * @property {{show:boolean}} enableAxis - Object property that allows axis to be enabled.
 * @property {{generalView.opacity:number}} Bars Opacity - Controls opacity of plotted bars, values range between 10 (almost transparent) to 100 (fully opaque, default)
 * @property {{generalView.curvedLines:boolean}} Show Help Button - When TRUE, the plot displays a button which launch a link to documentation.
 */

/**
 * Function that converts queried data into a view model that will be used by the visual.
 *
 * @function
 * @param {VisualUpdateOptions} options - Contains references to the size of the container
 *                                        and the dataView which contains all the data
 *                                        the visual had queried.
 * @param {IVisualHost} host            - Contains references to the host which contains services
 */
function visualTransform(options: VisualUpdateOptions, host: IVisualHost): measuresAxViewModel {
    let dataViews = options.dataViews;
    //console.log("options:", options);
    let colorPalette = host.colorPalette;

    let defaultSettings: measuresAxSettings = {
        legend: {
            show: true,
            position: "Top",
            showTitle: true,
            titleText: "",
            labelColor: "#000000",
            fontSize: 8,
        },
        enableAxis: {
            show: true,
            fontSize: 8,
            xAxis: true,
            xAxisTitle: "",
            yAxis1: true,
            yAxis1Title: "",
            yAxis1Proportion: 1.5,
            yAxis2: true,
            yAxis2Title: "",
            yAxis2Proportion: 1.1,
            yAxis1ScaleYAxis2: false,
        },
        generalView: {
            opacity: 100,
            fill: "#FFBB00",
            gradientColor: false,
            curvedLines: false,
            bgChart: "Bar",
        },
        averageLine: {
            show: false,
            displayName: "Average Line",
            fill: "#888888",
            showDataLabel: false
        }
    };
    let viewModel: measuresAxViewModel = {
        categories: [],
        dataMax: 0,
        dataMax2: 0,
        xAxisTitle: "",
        yAxis1Title: "",
        yAxis2Title: "",
        settings: <measuresAxSettings>{},
        legendData: null,
        legendGroups: []
    };

    if (!dataViews
        || !dataViews[0]
        || !dataViews[0].table
        || !dataViews[0].table.columns
        || !dataViews[0].table.rows
        || dataViews[0].table.rows.length <= 0
    ) {
        return viewModel;
    }

    //console.log("not return.");

    let xAxisTitle = "";
    let yAxis1Title = "";
    let yAxis2Title = "";
    let dataMax: number = 0;
    let dataMax2: number = 0;
    let categories: string[] = [];
    let categoriesAll: string[] = [];
    let catesidx = [];
    let legendsidx = [];
    let yAxis1Idx = [];
    let yAxis2Idx = [];
    let columns = dataViews[0].table.columns;
    let legendDataPoints: LegendDataPoint[] = [];
    let objects = dataViews[0].metadata.objects;

    //console.log("objests:", objects);
    for (let j = 0, clen = columns.length; j < clen; j++) {
        let col = columns[j];
        if (col.roles.xAxis) {
            catesidx.push(col);
            if (xAxisTitle.length > 0) xAxisTitle += " / ";
            xAxisTitle += col.displayName;
        }
        if (col.roles.legend) legendsidx.push(col);
        if (col.roles.yAxis1) {
            yAxis1Idx.push(col);
            yAxis1Title = col.displayName;
        }
        if (col.roles.yAxis2) {
            yAxis2Idx.push(col);
            yAxis2Title = col.displayName;
        }
    }
    //set settings
    defaultSettings.legend.titleText = "Legend";
    defaultSettings.enableAxis.xAxisTitle = xAxisTitle;

    defaultSettings.enableAxis.yAxis1Title = yAxis1Title
    defaultSettings.enableAxis.yAxis2Title = yAxis2Title;

    let measuresAxSettings: measuresAxSettings = {
        legend: {
            show: getValue<boolean>(objects, 'legend', 'show', defaultSettings.legend.show),
            position: getValue<string>(objects, 'legend', 'position', defaultSettings.legend.position),
            showTitle: getValue<boolean>(objects, 'legend', 'showTitle', defaultSettings.legend.showTitle),
            titleText: getValue<string>(objects, 'legend', 'titleText', defaultSettings.legend.titleText),
            labelColor: getValue<Fill>(objects, "legend", "labelColor",
                {
                    solid: {
                        color: defaultSettings.legend.labelColor,
                    }
                },
            ).solid.color,
            fontSize: getValue<number>(objects, 'legend', 'fontSize', defaultSettings.legend.fontSize),
        },

        enableAxis: {
            show: getValue<boolean>(objects, 'enableAxis', 'show', defaultSettings.enableAxis.show),
            fontSize: getValue<number>(objects, 'enableAxis', 'fontSize', defaultSettings.legend.fontSize),
            xAxis: getValue<boolean>(objects, 'enableAxis', 'xAxis', defaultSettings.enableAxis.xAxis),
            xAxisTitle: getValue<string>(objects, 'enableAxis', 'xAxisTitle', defaultSettings.enableAxis.xAxisTitle),
            yAxis1: getValue<boolean>(objects, 'enableAxis', 'yAxis1', defaultSettings.enableAxis.yAxis1),
            yAxis1Title: getValue<string>(objects, 'enableAxis', 'yAxis1Title', defaultSettings.enableAxis.yAxis1Title),
            yAxis1Proportion: getValue<number>(objects, 'enableAxis', 'yAxis1Proportion', defaultSettings.enableAxis.yAxis1Proportion),
            yAxis2: getValue<boolean>(objects, 'enableAxis', 'yAxis2', defaultSettings.enableAxis.yAxis2),
            yAxis2Title: getValue<string>(objects, 'enableAxis', 'yAxis2Title', defaultSettings.enableAxis.yAxis2Title),
            yAxis2Proportion: getValue<number>(objects, 'enableAxis', 'yAxis2Proportion', defaultSettings.enableAxis.yAxis2Proportion),
            yAxis1ScaleYAxis2: getValue<boolean>(objects, 'enableAxis', 'yAxis1ScaleYAxis2', defaultSettings.enableAxis.yAxis1ScaleYAxis2),
        },
        generalView: {
            opacity: getValue<number>(objects, 'generalView', 'opacity', defaultSettings.generalView.opacity),
            fill: getValue<Fill>(objects, "generalView", "fill",
                {
                    solid: {
                        color: defaultSettings.generalView.fill,
                    }
                },
            ).solid.color,

            gradientColor: getValue<boolean>(objects, 'generalView', 'gradientColor', defaultSettings.generalView.gradientColor),
            curvedLines: getValue<boolean>(objects, 'generalView', 'curvedLines', defaultSettings.generalView.curvedLines),
            bgChart: getValue<string>(objects, 'generalView', 'bgChart', defaultSettings.generalView.bgChart),
        },

        averageLine: {
            show: getValue<boolean>(objects, 'averageLine', 'show', defaultSettings.averageLine.show),
            displayName: getValue<string>(objects, 'averageLine', 'displayName', defaultSettings.averageLine.displayName),
            fill: getValue<string>(objects, 'averageLine', 'fill', defaultSettings.averageLine.fill),
            showDataLabel: getValue<boolean>(objects, 'averageLine', 'showDataLabel', defaultSettings.averageLine.showDataLabel),
        },
    };


    loadCateDate(catesidx, categories, categoriesAll, dataViews[0]);

    let legendGroups: measuresAxLegendGroup[] = [];
    for (let k = 0, llen = yAxis1Idx.length; k < llen; k++) {

        let legend = yAxis1Idx[k].displayName;
        let legendSelectionId = host.createSelectionIdBuilder()
            .withMeasure(yAxis1Idx[k].queryName)
            .createSelectionId();
        let dc = getTableObjectValue(columns, yAxis1Idx[k].index, "colorSelector", "fill", {
            solid: {
                color: colorPalette.getColor(legend).value,
            }
        });

        let ldp: LegendDataPoint = {
            label: legend,
            color: dc.solid.color,
            selected: false,
            identity: legendSelectionId,
            markerShape: measuresAxSettings.generalView.curvedLines ? legendInterfaces.MarkerShape.circle : legendInterfaces.MarkerShape.square
        }
        legendDataPoints.push(ldp);
        let legRow = loadYAxisData(yAxis1Idx[k], catesidx, categoriesAll, ldp, dataViews[0], host, "yAxis1");
        legRow.legendSelectinId = legendSelectionId;
        legendGroups.push(legRow);

        if (legRow.yAxis1Max) dataMax = legRow.yAxis1Max && legRow.yAxis1Max > dataMax ? legRow.yAxis1Max : dataMax;
    }

    for (let k = 0, llen = yAxis2Idx.length; k < llen; k++) {
        let legend = yAxis2Idx[k].displayName;
        let legendSelectionId = host.createSelectionIdBuilder()
            .withMeasure(yAxis2Idx[k].queryName)
            .createSelectionId();
        let dc = getTableObjectValue(columns, yAxis1Idx[k].index, "colorSelector", "fill", {
            solid: {
                color: measuresAxSettings.generalView.fill,
            }
        });
        let ldp: LegendDataPoint = {
            label: legend,
            color: dc.solid.color,
            selected: false,
            identity: legendSelectionId,
            markerShape: measuresAxSettings.generalView.curvedLines ? legendInterfaces.MarkerShape.circle : legendInterfaces.MarkerShape.square
        }
        //legendDataPoints.push(ldp);

        let legRow = loadYAxisData(yAxis2Idx[k], catesidx, categoriesAll, ldp, dataViews[0], host, "yAxis2");
        legRow.legendSelectinId = legendSelectionId;
        legendGroups.push(legRow);

        if (legRow.yAxis1Max) dataMax2 = legRow.yAxis1Max && legRow.yAxis1Max > dataMax2 ? legRow.yAxis1Max : dataMax2;
    }

    let legendData: LegendData = {
        fontSize: measuresAxSettings.legend.fontSize,
        dataPoints: legendDataPoints.sort(function (l1, l2) { return l1.label.toUpperCase() < l2.label.toUpperCase() ? -1 : 1 }),
        title: measuresAxSettings.legend.showTitle ? measuresAxSettings.legend.titleText : "",
        labelColor: measuresAxSettings.legend.labelColor,
    };

    return {
        categories: categories,
        dataMax: dataMax,
        dataMax2: dataMax2,
        xAxisTitle: xAxisTitle,
        yAxis1Title: yAxis1Title,
        yAxis2Title: yAxis2Title,
        settings: measuresAxSettings,
        legendData: legendData,

        legendGroups: legendGroups.sort(function (l1, l2) { return l1.displayName.toUpperCase() < l2.displayName.toUpperCase() ? -1 : 1 })
    };
}

function getTableSelectionIds(dataView, host: IVisualHost, key: number): ISelectionId[] {
    return dataView.table.identity.map((identity) => {
        const categoryColumn: DataViewCategoryColumn = {
            source: dataView.table.columns[key],
            values: null,
            identity: [identity]
        };

        return host.createSelectionIdBuilder()
            .withCategory(categoryColumn, key)
            .createSelectionId();
    });
}

function loadCateDate(catesidx, categories, categoriesAll, dataView) {

    for (let i = 0, rlen = dataView.table.rows.length; i < rlen; i++) {
        let row = dataView.table.rows[i];
        let cate = "";

        for (let l = 0, clen = catesidx.length; l < clen; l++) {
            if (l > 0) cate += " / ";
            cate += row[catesidx[l].index].toString();
        }

        categoriesAll.push(cate);
        if (categories.length > 0) {
            if (!categories.find(function (el: string) { return el === cate; })) categories.push(cate);
        }
        else {
            categories.push(cate);
        }

    }
}

function loadYAxisData(yAxisIdx, catesidx, categoriesAll, legData: LegendDataPoint, dataView, host, aFlag: string) {
    let dataRows: measuresAxDataCell[] = [];

    let format: string = "#,##0.00;-#,##0.00";
    if (dataView.table.columns && dataView.table.columns[yAxisIdx.index] && dataView.table.columns[yAxisIdx.index].format) {
        format = dataView.table.columns[yAxisIdx.index].format;
    }

    for (let i = 0, rlen = dataView.table.rows.length; i < rlen; i++) {
        let rowSelectionId = host.createSelectionIdBuilder()
            .withTable(dataView.table, i)
            .createSelectionId();

        let row = dataView.table.rows[i];
        //let cate = "";

        let yAxis1Value = null;
        //let yAxis2Value = null;

        if (row[yAxisIdx.index]) {
            yAxis1Value = <number>row[yAxisIdx.index];

            let dc: measuresAxDataCell = {
                category: categoriesAll[i],
                legend: legData.label,
                color: legData.color,
                format: format,
                yAxis1Value: yAxis1Value,
                rowSelectionId: rowSelectionId,
            };
            dataRows.push(dc);
        }

    }
    //console.log("datarow:", dataRows);
    let aggregatedDataRows: measuresAxDataCell[] = [];
    let yAxis1Max: number = 0;

    if (dataRows && dataRows.length > 0) {
        let sortedDataRows = dataRows.sort(function (c1, c2) { return c1.category < c2.category ? -1 : 1 });
        let cell = sortedDataRows[0];
        //console.log("sorteddata:", sortedDataRows, cell);
        for (let a = 1, slen = sortedDataRows.length; a < slen; a++) {
            let cell2 = sortedDataRows[a];
            if (cell.category === cell2.category) {
                if (cell2.yAxis1Value) cell.yAxis1Value += cell2.yAxis1Value;
            }
            else {
                aggregatedDataRows.push(cell);
                cell = cell2;
            }
        }
        aggregatedDataRows.push(cell);
        //console.log("aggregatedDataRows:", aggregatedDataRows, cell);

        for (cell of aggregatedDataRows) {
            yAxis1Max = cell.yAxis1Value && cell.yAxis1Value > yAxis1Max ? cell.yAxis1Value : yAxis1Max;
        }
    }
    let legRow: measuresAxLegendGroup = {
        selected: false,
        identity: null,
        specificIdentity: null,
        displayName: legData.label,
        color: legData.color,
        legendSelectinId: null,
        dataPoints: aggregatedDataRows,
        yAxis1Max: yAxis1Max,
        AxisFlag: aFlag,
    }

    return legRow;
}

function getColumnColorByIndex(
    category: DataViewCategoryColumn,
    index: number,
    colorPalette: ISandboxExtendedColorPalette,
): string {
    if (colorPalette.isHighContrast) {
        return colorPalette.background.value;
    }

    const defaultColor: Fill = {
        solid: {
            color: colorPalette.getColor(`${category.values[index]}`).value,
        }
    };

    return getCategoricalObjectValue<Fill>(
        category,
        index,
        'colorSelector',
        'fill',
        defaultColor
    ).solid.color;
}

function getColumnColorBySeries(
    series: powerbi.DataViewValueColumnGroup,
    colorPalette: ISandboxExtendedColorPalette,
): string {
    if (colorPalette.isHighContrast) {
        return colorPalette.background.value;
    }

    const defaultColor: Fill = {
        solid: {
            color: colorPalette.getColor(series.name.toString()).value,
        }
    };

    return getSerieObjectValue<Fill>(
        series,
        'colorSelector',
        'fill',
        defaultColor
    ).solid.color;
    //return defaultColor.solid.color;
}

export class measuresAx implements IVisual {
    private viewport: IViewport;
    private svg: Selection<any>;
    private host: IVisualHost;
    private selectionManager: ISelectionManager;
    private legend: ILegend;

    private measuresAxDiv: Selection<any>;
    private legendDiv: Selection<any>;
    private measuresAxSvg: Selection<any>;
    private legendSvg: Selection<any>;
    private gradientContainer: Selection<SVGElement>;
    private barContainer: Selection<SVGElement>;
    private lineContainer: Selection<SVGElement>;
    private bubbleContainer: Selection<SVGElement>;
    private xAxis: Selection<SVGElement>;
    private yAxis1: Selection<SVGElement>;
    private yAxis2: Selection<SVGElement>;
    private measuresAxLegendGroups: measuresAxLegendGroup[];
    private categories: string[];
    private measuresAxSettings: measuresAxSettings;
    private tooltipServiceWrapper: ITooltipServiceWrapper;

    private element: HTMLElement;
    private averageLine: Selection<SVGElement>;
    private interactivityService: IInteractivityService<LegendDataPoint>;
    private interactiveBehavior: IInteractiveBehavior;

    private gradientSelection: d3.Selection<d3.BaseType, any, d3.BaseType, any>;
    private barSelection: d3.Selection<d3.BaseType, any, d3.BaseType, any>;
    private lineSelection: d3.Selection<d3.BaseType, any, d3.BaseType, any>;
    private bubbleSelection: d3.Selection<d3.BaseType, any, d3.BaseType, any>;

    static Config = {
        xScalePadding: 0.1,
        solidOpacity: 1,
        transparentOpacity: 0.4,
        margins: {
            top: 10,
            right: 80,
            bottom: 80,
            left: 80,
        },
        AxisFontMultiplier: 0.025,
        BubbleMultiplier: 0.007,
    };

    /**
     * Creates instance of measuresAx. This method is only called once.
     *
     * @constructor
     * @param {VisualConstructorOptions} options - Contains references to the element that will
     *                                             contain the visual and a reference to the host
     *                                             which contains services.
     */
    constructor(options: VisualConstructorOptions) {
        this.host = options.host;
        this.element = options.element;
        this.selectionManager = this.host.createSelectionManager();

        // this.selectionManager.registerOnSelectCallback(() => {
        //     this.syncSelectionState(this.barSelection, <ISelectionId[]>this.selectionManager.getSelectionIds());
        // });


        this.tooltipServiceWrapper = createTooltipServiceWrapper(this.host.tooltipService, options.element);

        // top container svg
        this.measuresAxDiv = d3Select(options.element).append("div")
            .classed("floatDiv", true)
            ;
        this.legendDiv = d3Select(options.element).append("div")
            .classed("legendLeft", true)
            .style("display", "none");
        ;

        this.measuresAxSvg = d3Select(options.element).append("svg")
            .classed("measuresAxSvg", true)
            .attr("width", 900)
            .attr("height", 400)
            ;

        //this.svg = d3Select(options.element)
        this.legendSvg = this.measuresAxSvg
            .append('svg')
            .classed('multiLegend', true)
            .style("fill-opacity", 50)
            ;

        //this.svg = d3Select(options.element)
        this.svg = this.measuresAxSvg
            .append('svg')
            .classed('measuresAx', true)
            .style("fill-opacity", 50)
            ;

        this.gradientContainer = this.svg
            .append('g')
            .classed('gradientContainer', true);

        this.barContainer = this.svg
            .append('g')
            .classed('barContainer', true);

        this.lineContainer = this.svg
            .append('g')
            .classed('lineContainer', true);

        this.bubbleContainer = this.svg
            .append('g')
            .classed('bubbleContainer', true);

        this.xAxis = this.svg
            .append('g')
            .classed('xAxis', true)
            ;
        this.xAxis.append("text")
            .attr("class", "xAxisTitle")
            .attr("fill", "currentColor")
            ;

        this.yAxis1 = this.svg
            .append('g')
            .classed('yAxis1', true)
            ;
        this.yAxis1
            .append("text")
            .attr("class", "yAxis1Title")
            .attr("fill", "currentColor")
            ;

        this.yAxis2 = this.svg
            .append('g')
            .classed('yAxis2', true)
            ;
        this.yAxis2
            .append("text")
            .attr("class", "yAxis2Title")
            .attr("fill", "currentColor")
            ;

        this.initAverageLine();

        this.interactivityService = createInteractivityService(this.host);
        //this.interactiveBehavior = this.host.colorPalette.isHighContrast ? new OpacityLegendBehavior() : null;
        this.interactiveBehavior = new legendBehavior();

        //console.log("opalegbeh:", this.interactiveBehavior);
        this.legend = createLegend(
            this.legendSvg.node(),
            false,
            this.interactivityService,
            true,
            LegendPosition.Left
        )

        this.handleContextMenu();
    }

    /**
     * Updates the state of the visual. Every sequential databinding and resize will call update.
     *
     * @function
     * @param {VisualUpdateOptions} options - Contains references to the size of the container
     *                                        and the dataView which contains all the data
     *                                        the visual had queried.
     */
    public update(options: VisualUpdateOptions) {
        let viewModel: measuresAxViewModel = visualTransform(options, this.host);
        //console.log("viewModel: ", viewModel);
        const selfObj: this = this;
        let settings = this.measuresAxSettings = viewModel.settings;
        this.measuresAxLegendGroups = viewModel.legendGroups;
        this.categories = viewModel.categories;
        this.viewport = options.viewport;

        let width = options.viewport.width;
        let height = options.viewport.height;
        if (!viewModel.legendGroups || viewModel.legendGroups.length <= 0
            || !viewModel.legendGroups[0] || viewModel.legendGroups[0].dataPoints.length <= 0) {
            showMessage(true, "No Data for Current Query, which may be caused by the combination of slicer selections. You may need to refine slicer selections to see the chart.");
            return;
        }
        else {
            showMessage(false, "");
        }

        this.measuresAxSvg
            .attr("width", this.viewport.width)
            .attr("height", this.viewport.height)
            ;

        this.renderLegend(viewModel, this.viewport);
        //this.myRenderLegend(viewModel, selfObj, this.viewport);
        let legendMargins = this.legend.getMargins();
        let margins = measuresAx.Config.margins;
        let top = 0;
        let left = 0;
        if (!this.measuresAxSettings.legend.show) {
            legendMargins.width = 0;
            legendMargins.height = 0;
            this.legendSvg.style("display", "none");
        }
        else {
            width -= legendMargins.width;
            height -= legendMargins.height;
            this.legendSvg.style("display", "inherit")
                .attr("width", legendMargins.width === 0 ? width : legendMargins.width)
                .attr("height", legendMargins.height === 0 ? height : legendMargins.height)
                ;

            switch (this.measuresAxSettings.legend.position) {
                case "Left":
                case "LeftCenter":
                    left = legendMargins.width;
                    top = 0;
                    this.legendSvg.attr("x", 0)
                        .attr("y", 0)
                        ;
                    break;
                case "Right":
                case "RightCenter":
                    left = 0;
                    top = 0
                    this.legendSvg.attr("x", width)
                        .attr("y", 0)
                        ;
                    break;

                case "Top":
                case "TopCenter":
                    left = 0;
                    top = legendMargins.height;
                    this.legendSvg.attr("x", 0)
                        .attr("y", 0)
                        ;
                    break;
                case "Bottom":
                case "BottomCenter":
                    left = 0;
                    top = 0;
                    this.legendSvg.attr("x", 0)
                        .attr("y", height)
                        ;
                    break;
            }
        }

        this.svg
            .attr("width", width)
            .attr("height", height)
            .attr("x", left)
            .attr("y", top)
            ;

        if (settings.enableAxis.show) {
            height -= margins.bottom;
            width -= (margins.left);
            top = margins.top;
            left = margins.left;
        }

        //console.log("cate:", viewModel.dataPoints.map(d => d.category));
        let xScale;
        let yScale1;
        let yScale2;
        if (settings.generalView.bgChart === "Area") {
            xScale = scalePoint()
                //.domain(viewModel.dataPoints.map(d => d.category))
                .domain(this.categories)
                .range([left, width])
                //.padding(0.2)
                ;
        }
        else {
            xScale = scaleBand()
                .domain(viewModel.categories)
                .rangeRound([left, width])
                .padding(0.2)
                ;
        }

        drawXAxis();

        if (settings.enableAxis.yAxis1ScaleYAxis2) {
            let maxY = Math.max(viewModel.dataMax * settings.enableAxis.yAxis1Proportion, viewModel.dataMax2 * settings.enableAxis.yAxis2Proportion)
            yScale1 = scaleLinear()
                .domain([0, maxY])
                .range([height, top]);

            yScale2 = scaleLinear()
                .domain([0, maxY])
                .range([height, top])
                ;
        }
        else {
            yScale1 = scaleLinear()
                .domain([0, viewModel.dataMax * settings.enableAxis.yAxis1Proportion])
                .range([height, top]);

            yScale2 = scaleLinear()
                .domain([0, viewModel.dataMax2 * settings.enableAxis.yAxis2Proportion])
                .range([height, top])
                ;
        }
        drawYAxis1();
        drawYAxis2();

        addGradientColor();
        switch (settings.generalView.bgChart) {
            case "Bar": drawBars();
                break;
            case "Area": drawFilledLines();
                break;
            default: drawBars();
                break;
        }

        drawLines();
        drawBubbles();

        //console.log("legendico:", legendIcons, lines, bubbles);

        function showMessage(display: boolean, message: string) {
            //          console.log("displayt:", display, width, height);
            selfObj.measuresAxSvg
                .attr("width", width * 0.8)
                .attr("height", height * 0.8)
                .attr("left", width * 0.1)
                .attr("top", height * 0.2)
                .style("display", display ? "none" : "block");

            var html = "<table border = 0 width = 80% align=center>";
            html += "<tr><td>";
            html += message;
            html += "</td></tr>";
            html += "</table>";
            selfObj.measuresAxDiv.html(html)
                // .style("background-color", fillColor ? fillColor : "lightgray")
                .style("display", display ? "block" : "none");
        }

        function addGradientColor() {
            selfObj.gradientContainer.selectAll(".gradient").remove();
            let grad = selfObj.gradientContainer.append("linearGradient")
                .attr("id", "grad1")
                .attr("y1", "0%")
                .attr("x1", "0%")
                .attr("y2", "100%")
                .attr("x2", "0%")
                ;
            grad.append("stop")
                .attr("offset", "0%")
                .style("stop-color", settings.generalView.fill)
                ;
            grad.append("stop")
                .attr("offset", "100%")
                .style("stop-color", "#FFFFFF")
                ;
        }

        function drawXAxis() {
            let uxAxis = axisBottom(xScale);
            selfObj.xAxis.attr('transform', 'translate(0, ' + height + ')')
                .style("font-size", settings.enableAxis.fontSize)
                .call(uxAxis)
                .selectAll("text")
                .style("text-anchor", "end")
                .attr("transform", "rotate(-45)")
                ;

            selfObj.xAxis.select(".xAxisTitle")
                .style("text-anchor", "middle")
                .style("font-size", settings.enableAxis.fontSize)
                .attr("x", width / 2)
                .attr("y", measuresAx.Config.margins.bottom - 20)
                .attr("transform", "rotate(0)")
                .attr("font-size", Math.min(height, width) * measuresAx.Config.AxisFontMultiplier)
                .text(settings.enableAxis.xAxisTitle)
                .style("display", settings.enableAxis.xAxis ? "block" : "none")
                ;

            selfObj.svg.selectAll(".xAxis").style("display", settings.enableAxis.show ? "block" : "none");

        }

        function drawYAxis1() {
            let uyAxis1 = axisLeft(yScale1);
            selfObj.yAxis1.attr('transform', 'translate(' + margins.left + ', ' + 0 + ')')
                .style("font-size", settings.enableAxis.fontSize)
                .call(uyAxis1)
                ;

            selfObj.yAxis1.select(".yAxis1Title")
                .style("text-anchor", "middle")
                .style("font-size", settings.enableAxis.fontSize)
                .attr("x", 0 - height / 2)
                .attr("y", 0 - measuresAx.Config.margins.left + 30)
                .attr("transform", "rotate(-90)")
                .attr("font-size", Math.min(height, width) * measuresAx.Config.AxisFontMultiplier)
                .text(settings.enableAxis.yAxis1Title)
                .style("display", settings.enableAxis.yAxis1 ? "block" : "none")
                ;

            selfObj.svg.selectAll(".yAxis1").style("display", settings.enableAxis.show && settings.enableAxis.yAxis1 ? "block" : "none");
        }

        function drawYAxis2() {
            let uyAxis2 = axisRight(yScale2);
            selfObj.yAxis2.attr('transform', 'translate(' + (width) + ', ' + 0 + ')')
                .style("font-size", settings.enableAxis.fontSize)
                .style("fill", viewModel.settings.generalView.fill)
                .call(uyAxis2)
                ;

            selfObj.yAxis2.select(".yAxis2Title")
                .style("text-anchor", "middle")
                .style("font-size", settings.enableAxis.fontSize)
                .attr("x", height / 2)
                .attr("y", -50)
                .attr("transform", "rotate(90)")
                .attr("font-size", Math.min(height, width) * measuresAx.Config.AxisFontMultiplier)
                .text(settings.enableAxis.yAxis2Title)
                .style("display", settings.enableAxis.yAxis2 ? "block" : "none")
                ;

            selfObj.svg.selectAll(".yAxis2").style("display", settings.enableAxis.show && settings.enableAxis.yAxis2 ? "block" : "none");
        }

        function drawBars() {
            selfObj.barContainer.selectAll(".filledLine").remove();

            for (let i = 0, glen = selfObj.measuresAxLegendGroups.length; i < glen; i++) {
                if (selfObj.measuresAxLegendGroups[i].AxisFlag === "yAxis2") {
                    selfObj.barSelection = selfObj.barContainer
                        .selectAll('.bar')
                        .data(selfObj.measuresAxLegendGroups[i].dataPoints)
                        ;
                    break;
                }
            }
            const barSelectionMerged = selfObj.barSelection
                .enter()
                .append('rect')
                .merge(<any>selfObj.barSelection);

            barSelectionMerged.classed('bar', true);

            const opacity: number = settings.generalView.opacity / 100;
            barSelectionMerged
                .attr("width", xScale.bandwidth())
                .attr("height", d => height - yScale2(d.yAxis1Value))
                .attr("y", d => yScale2(d.yAxis1Value))
                .attr("x", d => xScale(d.category))
                .style("fill-opacity", opacity)
                .style("stroke-opacity", opacity)
                //.style("fill", settings.generalView.fill)
                .attr("fill", settings.generalView.gradientColor ? "url(#grad1)" : settings.generalView.fill)
                .style("display", settings.enableAxis.yAxis2 ? "block" : "none")
                ;

            selfObj.tooltipServiceWrapper.addTooltip(selfObj.barContainer.selectAll('.bar'),
                (tooltipEvent: TooltipEventArgs<measuresAxDataCell>) => selfObj.getTooltipData2(tooltipEvent.data),
                (tooltipEvent: TooltipEventArgs<measuresAxDataCell>) => tooltipEvent.data.rowSelectionId
            );

            barSelectionMerged.on('click', (d) => {
                // Allow selection only if the visual is rendered in a view that supports interactivity (e.g. Report)
                //console.log("barselctionmeg:", d, selfObj.host.allowInteractions);
                //if (selfObj.host.allowInteractions) {
                const isCtrlPressed: boolean = (<MouseEvent>d3Event).ctrlKey;

                selfObj.selectionManager
                    .select(d.rowSelectionId, isCtrlPressed)
                    .then((ids: ISelectionId[]) => {
                        //console.log("ids:", ids);
                        selfObj.syncSelectionState(barSelectionMerged, ids);
                    });

                (<Event>d3Event).stopPropagation();
                //}
            });

            selfObj.barSelection
                .exit()
                .remove();

            selfObj.handleClick(barSelectionMerged);
        }

        function drawFilledLines() {
            selfObj.barContainer.selectAll(".bar").remove();

            var line = d3.line<measuresAxDataCell>()
                .x(function (d) { return xScale(d.category); })
                .y(function (d) { return yScale2(d.yAxis1Value); })
                ;
            if (settings.generalView.curvedLines) line.curve(d3.curveMonotoneX);

            let lineData: measuresAxDataCell[] = new Array();
            let d: measuresAxDataCell = selfObj.measuresAxLegendGroups[0].dataPoints[0];
            for (let i = 0, glen = selfObj.measuresAxLegendGroups.length; i < glen; i++) {
                if (selfObj.measuresAxLegendGroups[i].AxisFlag === "yAxis2") {
                    let l = selfObj.measuresAxLegendGroups[i].dataPoints.length;
                    lineData.push({
                        category: d.category,
                        legend: d.legend,
                        color: d.color,
                        format: d.format,
                        rowSelectionId: d.rowSelectionId,
                        yAxis1Value: 0,
                    });
                    selfObj.measuresAxLegendGroups[i].dataPoints.forEach(function (d) {
                        lineData.push(d);
                    });
                    d = selfObj.measuresAxLegendGroups[i].dataPoints[l - 1];
                    lineData.push({
                        category: d.category,
                        legend: d.legend,
                        color: d.color,
                        format: d.format,
                        rowSelectionId: d.rowSelectionId,

                        yAxis1Value: 0,
                    });
                }
            }

            let linesData = [];
            let ls: measuresAxLegendGroup = {
                selected: false,
                identity: selfObj.measuresAxLegendGroups[0].legendSelectinId,
                specificIdentity: selfObj.measuresAxLegendGroups[0].legendSelectinId,
                displayName: selfObj.measuresAxLegendGroups[0].displayName,
                color: selfObj.measuresAxLegendGroups[0].color,
                legendSelectinId: selfObj.measuresAxLegendGroups[0].legendSelectinId,
                dataPoints: lineData,
                yAxis1Max: selfObj.measuresAxLegendGroups[0].yAxis1Max,
                AxisFlag: selfObj.measuresAxLegendGroups[0].AxisFlag,
            };

            linesData.push(ls);
            selfObj.barSelection = selfObj.barContainer
                .selectAll('.filledLine')
                .data(linesData)
                ;
            const barSelectionMerged = selfObj.barSelection
                .enter()
                .append('path')
                .merge(<any>selfObj.barSelection);

            barSelectionMerged.classed('filledLine', true);

            //console.log("outline:", lineData, linesData);
            const opacity: number = settings.generalView.opacity / 100;
            barSelectionMerged
                .attr("class", "filledLine")
                .attr("d", function (d) { return line(d.dataPoints); })
                .attr("fill", settings.generalView.gradientColor ? "url(#grad1)" : settings.generalView.fill)
                .attr("stroke", settings.generalView.fill)
                .attr("stroke-width", 2)
                .attr("transform", "translate(" + (xScale.bandwidth() / 2) + ",0)")
                .style("display", settings.enableAxis.yAxis2 ? "block" : "none")
                ;

            selfObj.syncSelectionState(
                barSelectionMerged,
                <ISelectionId[]>selfObj.selectionManager.getSelectionIds()
            );

            barSelectionMerged.on('click', (d) => {
                // Allow selection only if the visual is rendered in a view that supports interactivity (e.g. Report)
                //if (selfObj.host.allowInteractions) {
                const isCtrlPressed: boolean = (<MouseEvent>d3Event).ctrlKey;

                selfObj.selectionManager
                    .select(d.selectionId, isCtrlPressed)
                    .then((ids: ISelectionId[]) => {
                        selfObj.syncSelectionState(barSelectionMerged, ids);
                    });

                (<Event>d3Event).stopPropagation();
                //}
            });

            selfObj.barSelection
                .exit()
                .remove();

            selfObj.handleClick(barSelectionMerged);
        }

        function getCategoryIndex(dp: measuresAxDataCell): number {
            for (let i = 0, clen = selfObj.categories.length; i < clen; i++) {
                if (selfObj.categories[i] === dp.category) {
                    return i;
                }
            }
            return -1;
        }

        function drawLines() {
            var line = d3.line<measuresAxDataCell>()
                .x(function (d) { return xScale(d.category); })
                .y(function (d) { return yScale1(d.yAxis1Value); })
                ;
            if (settings.generalView.curvedLines) line.curve(d3.curveMonotoneX);

            let lineData: measuresAxLegendGroup[] = [];
            for (let i = 0, mlen = selfObj.measuresAxLegendGroups.length; i < mlen; i++) {
                if (selfObj.measuresAxLegendGroups[i].AxisFlag === "yAxis1") {
                    //console.log("legindgrou:", selfObj.measuresAxLegendGroups[i]);
                    let mlg: measuresAxLegendGroup = {
                        selected: false,
                        identity: selfObj.measuresAxLegendGroups[i].legendSelectinId,
                        specificIdentity: selfObj.measuresAxLegendGroups[i].legendSelectinId,
                        displayName: selfObj.measuresAxLegendGroups[i].displayName,
                        color: selfObj.measuresAxLegendGroups[i].color,
                        legendSelectinId: selfObj.measuresAxLegendGroups[i].legendSelectinId,
                        dataPoints: null,
                        yAxis1Max: selfObj.measuresAxLegendGroups[i].yAxis1Max,
                        AxisFlag: selfObj.measuresAxLegendGroups[i].AxisFlag,
                    }
                    let lgd: measuresAxDataCell[] = [];
                    let lastCategoryIndex = -1;
                    for (let k = 0, glen = selfObj.measuresAxLegendGroups[i].dataPoints.length; k < glen; k++) {
                        let datacell = selfObj.measuresAxLegendGroups[i].dataPoints[k];
                        let categoryIndex = getCategoryIndex(datacell);
                        if (categoryIndex - 1 === lastCategoryIndex) {
                            lgd.push(datacell);
                        }
                        else {
                            if (lgd.length > 1) {
                                mlg.dataPoints = lgd;
                                lineData.push(mlg);
                                mlg = {
                                    selected: false,
                                    identity: selfObj.measuresAxLegendGroups[i].legendSelectinId,
                                    specificIdentity: selfObj.measuresAxLegendGroups[i].legendSelectinId,
                                    displayName: selfObj.measuresAxLegendGroups[i].displayName,
                                    color: selfObj.measuresAxLegendGroups[i].color,
                                    legendSelectinId: selfObj.measuresAxLegendGroups[i].legendSelectinId,
                                    dataPoints: null,
                                    yAxis1Max: selfObj.measuresAxLegendGroups[i].yAxis1Max,
                                    AxisFlag: selfObj.measuresAxLegendGroups[i].AxisFlag,
                                };
                            }
                            lgd = [];
                            lgd.push(datacell);
                        }
                        lastCategoryIndex = categoryIndex;
                    }
                    if (lgd.length > 1) {
                        mlg.dataPoints = lgd;
                        lineData.push(mlg);
                    }
                }
            }
            selfObj.lineSelection = selfObj.lineContainer
                .selectAll('.line')
                .data(lineData)
                ;
            const lineSelectionMerged = selfObj.lineSelection
                .enter()
                .append('path')
                .merge(<any>selfObj.lineSelection)
                ;

            lineSelectionMerged
                .attr("class", "line")
                .attr("d", function (d) { return line(d.dataPoints); })
                .attr("fill", "none")
                .attr("stroke", function (d) { return d.color; })
                .attr("stroke-width", 2)
                .attr("transform", "translate(" + (xScale.bandwidth() / 2) + ",0)")
                .style("display", settings.enableAxis.yAxis1 ? "block" : "none");

            selfObj.syncSelectionState(
                lineSelectionMerged,
                <ISelectionId[]>selfObj.selectionManager.getSelectionIds()
            );

            selfObj.lineSelection
                .exit()
                .remove();
            selfObj.handleClick(lineSelectionMerged);

        }

        function drawBubbles() {
            let allPoints: measuresAxDataCell[] = [];
            for (let i = 0, mlen = selfObj.measuresAxLegendGroups.length; i < mlen; i++) {
                if (selfObj.measuresAxLegendGroups[i].AxisFlag === "yAxis1") {
                    allPoints = allPoints.concat(selfObj.measuresAxLegendGroups[i].dataPoints);
                }
            }
            selfObj.bubbleSelection = selfObj.bubbleContainer
                .selectAll('.bubble')
                .data(allPoints)
                ;
            const bubbleSelectionMerged = selfObj.bubbleSelection
                .enter()
                .append('circle')
                .merge(<any>selfObj.bubbleSelection)
                ;

            bubbleSelectionMerged
                .attr("class", "bubble")
                .attr("cx", d => xScale(d.category))
                .attr("cy", d => yScale1(<number>d.yAxis1Value))
                .attr("r", Math.min(height, width) * measuresAx.Config.BubbleMultiplier)
                .attr("fill", d => measuresAx.rgbToHsl(d.color))
                .attr("stroke", d => d.color)
                .attr("stroke-width", 2)
                .attr("transform", "translate(" + (xScale.bandwidth() / 2) + ",0)")
                .style("display", settings.enableAxis.yAxis1 ? "block" : "none");

            selfObj.tooltipServiceWrapper.addTooltip(selfObj.bubbleContainer.selectAll('.bubble'),
                (tooltipEvent: TooltipEventArgs<measuresAxDataCell>) => selfObj.getTooltipData1(tooltipEvent.data),
                (tooltipEvent: TooltipEventArgs<measuresAxDataCell>) => tooltipEvent.data.rowSelectionId
            );

            selfObj.syncSelectionState(
                bubbleSelectionMerged,
                <ISelectionId[]>selfObj.selectionManager.getSelectionIds()
            );

            selfObj.bubbleSelection
                .exit()
                .remove();

            selfObj.handleClick(bubbleSelectionMerged);
        }
    }

    private static wordBreak(
        textNodes: Selection<any, SVGElement>,
        allowedWidth: number,
        maxHeight: number
    ) {
        textNodes.each(function () {
            tms.wordBreak(
                this,
                allowedWidth,
                maxHeight);
        });
    }

    private handleClick(barSelection: d3.Selection<d3.BaseType, any, d3.BaseType, any>) {
        // Clear selection when clicking outside a bar
        this.svg.on('click', (d) => {
            //console.log("handelclick:", d);
            //if (this.host.allowInteractions) {
            this.selectionManager
                .clear()
                .then(() => {
                    this.syncSelectionState(barSelection, []);
                });
            //}
        });
    }

    private handleContextMenu() {
        this.svg.on('contextmenu', () => {
            const mouseEvent: MouseEvent = getEvent();
            const eventTarget: EventTarget = mouseEvent.target;
            let dataPoint: any = d3Select(<d3.BaseType>eventTarget).datum();
            this.selectionManager.showContextMenu(dataPoint ? dataPoint.selectionId : {}, {
                x: mouseEvent.clientX,
                y: mouseEvent.clientY
            });
            //   mouseEvent.preventDefault();
        });
    }

    private syncSelectionState(
        selection: Selection<measuresAxDataCell>,
        selectionIds: ISelectionId[]
    ): void {

        //console.log("snselectstate:", selection, selectionIds);
        if (!selection || !selectionIds) {
            return;
        }

        if (!selectionIds.length) {
            //const opacity: number = this.measuresAxSettings.generalView.opacity / 100;
            const opacity: number = this.measuresAxSettings.generalView.opacity;
            selection
                .style("fill-opacity", opacity)
                .style("stroke-opacity", opacity);

            return;
        }

        const self: this = this;

        selection.each(function (barDataPoint: measuresAxDataCell) {
            const isSelected: boolean = self.isSelectionIdInArray(selectionIds, barDataPoint.rowSelectionId);

            const opacity: number = isSelected
                ? measuresAx.Config.solidOpacity
                : measuresAx.Config.transparentOpacity;

            d3Select(this)
                .style("fill-opacity", opacity)
                .style("stroke-opacity", opacity);
        });
    }

    private isSelectionIdInArray(selectionIds: ISelectionId[], selectionId: ISelectionId): boolean {
        if (!selectionIds || !selectionId) {
            return false;
        }

        return selectionIds.some((currentSelectionId: ISelectionId) => {
            return currentSelectionId.includes(selectionId);
        });
    }

    /**
         * Get legend data, calculate position and draw it
         */
    private renderLegend(viewModel: measuresAxViewModel, viewport: IViewport): void {
        if (!viewModel.legendData || !viewModel.settings.legend.show) {
            this.legend.reset();
            return;
        }

        let position: LegendPosition = viewModel.settings.legend.show
            ? LegendPosition[viewModel.settings.legend.position]
            : LegendPosition.Left;
        this.legend.changeOrientation(position);
        this.legend.drawLegend(viewModel.legendData, JSON.parse(JSON.stringify(viewport)));

    }
    private myRenderLegend(viewModel: measuresAxViewModel, selfObj: measuresAx, viewport: IViewport): void {
        let legendSvg = selfObj.legendSvg;
        if (!viewModel.legendData || !viewModel.settings.legend.show) {
            legendSvg.selectAll().remove();
            return;
        }

        let position: LegendPosition = viewModel.settings.legend.show
            ? LegendPosition[viewModel.settings.legend.position]
            : LegendPosition.Left;
        let x = 0, y = 0, width = 0, height = 0;
        switch (this.measuresAxSettings.legend.position) {
            case "Left":
            case "LeftCenter":
                x = 0;
                y = 0;
                width = viewport.width / 4;
                height = viewport.height;
                break;
            case "Right":
            case "RightCenter":
                x = 3 * viewport.width / 4;
                y = 0;
                width = viewport.width / 4;
                height = viewport.height;
                break;
            case "Top":
            case "TopCenter":
                x = 0;
                y = 0;
                width = viewport.width;
                height = viewport.height / 5;
                break;
            case "Bottom":
            case "BottomCenter":
                x = 0;
                y = 4 * viewport.height / 5;
                width = viewport.width;
                height = viewport.height / 5;
                break;
        }
        legendSvg.attr("x", x)
            .attr("y", y)
            .attr("width", width)
            .attr("height", height)
            ;

    }

    /**
     * Enumerates through the objects defined in the capabilities and adds the properties to the format pane
     *
     * @function
     * @param {EnumerateVisualObjectInstancesOptions} options - Map of defined objects
     */
    public enumerateObjectInstances(options: EnumerateVisualObjectInstancesOptions): VisualObjectInstanceEnumeration {
        let objectName = options.objectName;
        let objectEnumeration: VisualObjectInstance[] = [];
        if (!this.measuresAxSettings ||
            !this.measuresAxSettings.enableAxis
        ) {
            // || !this.barDataPoints) {
            return objectEnumeration;
        }

        switch (objectName) {
            case 'enableAxis':
                objectEnumeration.push({
                    objectName: objectName,
                    properties: {
                        show: this.measuresAxSettings.enableAxis.show,
                        fontSize: this.measuresAxSettings.enableAxis.fontSize,
                        xAxis: this.measuresAxSettings.enableAxis.xAxis,
                        xAxisTitle: this.measuresAxSettings.enableAxis.xAxisTitle,
                        yAxis1: this.measuresAxSettings.enableAxis.yAxis1,
                        yAxis1Title: this.measuresAxSettings.enableAxis.yAxis1Title,
                        yAxis1Proportion: this.measuresAxSettings.enableAxis.yAxis1Proportion,
                        yAxis2: this.measuresAxSettings.enableAxis.yAxis2,
                        yAxis2Title: this.measuresAxSettings.enableAxis.yAxis2Title,
                        yAxis2Proportion: this.measuresAxSettings.enableAxis.yAxis2Proportion,
                        yAxis1ScaleYAxis2: this.measuresAxSettings.enableAxis.yAxis1ScaleYAxis2,
                    },
                    selector: null
                });
                break;
            case 'legend':
                objectEnumeration.push({
                    objectName: objectName,
                    properties: {
                        show: this.measuresAxSettings.legend.show,
                        position: this.measuresAxSettings.legend.position,
                        showTitle: this.measuresAxSettings.legend.showTitle,
                        titleText: this.measuresAxSettings.legend.titleText,
                        labelColor: this.measuresAxSettings.legend.labelColor,
                        fontSize: this.measuresAxSettings.legend.fontSize,
                    },
                    selector: null
                });
                break;
            case 'colorSelector':
                for (let grp of this.measuresAxLegendGroups) {
                    objectEnumeration.push({
                        //objectName: grp.group.name.toString(),
                        objectName: objectName,
                        displayName: grp.displayName,
                        properties: {
                            fill: {
                                solid: {
                                    color: grp.color
                                }
                            }
                        },
                        selector: grp.legendSelectinId.getSelector()
                    });
                }
                break;
            case 'generalView':
                objectEnumeration.push({
                    objectName: objectName,
                    properties: {
                        opacity: this.measuresAxSettings.generalView.opacity,
                        fill: this.measuresAxSettings.generalView.fill,
                        gradientColor: this.measuresAxSettings.generalView.gradientColor,
                        curvedLines: this.measuresAxSettings.generalView.curvedLines,
                        bgChart: this.measuresAxSettings.generalView.bgChart,
                    },
                    validValues: {
                        opacity: {
                            numberRange: {
                                min: 10,
                                max: 100
                            }
                        }
                    },
                    selector: null
                });
                break;
            case 'averageLine':
                objectEnumeration.push({
                    objectName: objectName,
                    properties: {
                        show: this.measuresAxSettings.averageLine.show,
                        displayName: this.measuresAxSettings.averageLine.displayName,
                        fill: this.measuresAxSettings.averageLine.fill,
                        showDataLabel: this.measuresAxSettings.averageLine.showDataLabel
                    },
                    selector: null
                });
                break;
        };
        //console.log("objectEnumeration: ", objectEnumeration);
        return objectEnumeration;
    }

    /**
     * Destroy runs when the visual is removed. Any cleanup that the visual needs to
     * do should be done here.
     *
     * @function
     */
    public destroy(): void {
        // Perform any cleanup tasks here
    }

    private getTooltipData1(value: measuresAxDataCell): VisualTooltipDataItem[] {
        //console.log("tip1:", value);
        let val = value.yAxis1Value.toString();
        let dec = val.indexOf(".");
        if (dec > 0 && dec < val.length - 3) {
            val = val.substring(0, dec + 3);
        }
        return [{
            displayName: value.category,
            value: val,
            color: value.color,
            header: this.measuresAxSettings.enableAxis.yAxis1Title + " : " + value.legend
        }];
    }

    private getTooltipData2(value: measuresAxDataCell): VisualTooltipDataItem[] {
        //console.log("tip2:", value);
        let val = value.yAxis1Value.toString();
        let dec = val.indexOf(".");
        if (dec > 0 && dec < val.length - 3) {
            val = val.substring(0, dec + 3);
        }
        return [{
            displayName: value.category,
            value: val,
            //value: value.yAxis1Value.toString(),
            color: this.measuresAxSettings.generalView.fill,
            header: this.measuresAxSettings.enableAxis.yAxis2Title,
        }];
    }

    private getColorValue(color: Fill | string): string {
        // Override color settings if in high contrast mode
        if (this.host.colorPalette.isHighContrast) {
            return this.host.colorPalette.foreground.value;
        }

        // If plain string, just return it
        if (typeof (color) === 'string') {
            return color;
        }
        // Otherwise, extract string representation from Fill type object
        return color.solid.color;
    }

    private initAverageLine() {
        this.averageLine = this.svg
            .append('g')
            .classed('averageLine', true);

        this.averageLine.append('line')
            .attr('id', 'averageLine');

        this.averageLine.append('text')
            .attr('id', 'averageLineLabel');
    }

    public static rgbToHsl(fill: string) {
        var r = Number("0x" + fill.substr(1, 2));
        var g = Number("0x" + fill.substr(3, 2));
        var b = Number("0x" + fill.substr(5, 2));

        r /= 255, g /= 255, b /= 255;
        var max = Math.max(r, g, b), min = Math.min(r, g, b);
        var h, s, l = (max + min) / 2;

        if (max == min) {
            h = s = 0; // achromatic
        } else {
            var d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch (max) {
                case r: h = h = ((g - b) / d) % 6; break;
                case g: h = (b - r) / d + 2; break;
                case b: h = (r - g) / d + 4; break;
            }
            h += h < 0 ? 6 : 0;
        }

        var hsl = [Math.round(h * 60), Math.round(s * 100), Math.round(l * 100)];
        var l = 15 * hsl[2] / 100 + 85;
        return "hsl(" + hsl[0] + "," + hsl[1] + "%, " + l + "%)";

    }
}