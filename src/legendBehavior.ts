import powerbiVisualsApi from "powerbi-visuals-api";
import powerbi = powerbiVisualsApi;

import { interactivityBaseService as interactivityService, interactivitySelectionService } from "powerbi-visuals-utils-interactivityutils";
import appendClearCatcher = interactivityService.appendClearCatcher;
import IInteractiveBehavior = interactivityService.IInteractiveBehavior;
import IInteractivityService = interactivityService.IInteractivityService;

import SelectableDataPoint = interactivitySelectionService.SelectableDataPoint;
import IBehaviorOptions = interactivityService.IBehaviorOptions;
import BaseDataPoint = interactivityService.BaseDataPoint;
import ISelectionHandler = interactivityService.ISelectionHandler;
const getEvent = () => require("d3-selection").event;
import * as d3 from "d3";

import { measuresAx, measuresAxLegendGroup } from "./measuresAx"


export interface BaseBehaviorOptions<SelectableDataPointType extends BaseDataPoint> extends IBehaviorOptions<SelectableDataPointType> {

    /** d3 selection object of the main elements on the chart */
    elementsSelection: d3.Selection<any, SelectableDataPoint, any, any>;

    linesSelection: d3.Selection<any, SelectableDataPoint, any, any>;

    /** d3 selection object of some elements on backgroup, to hadle click of reset selection */
    clearCatcherSelection: d3.Selection<any, any, any, any>;
}

export class legendBehavior<SelectableDataPointType extends BaseDataPoint> implements IInteractiveBehavior {
    /** d3 selection object of main elements in the chart */
    protected options: BaseBehaviorOptions<SelectableDataPointType>;
    protected selectionHandler: ISelectionHandler;

    protected bindClick() {
        const {
            elementsSelection
        } = this.options;

        elementsSelection.on("click", (datum) => {
            const mouseEvent: MouseEvent = getEvent() as MouseEvent || window.event as MouseEvent;
            mouseEvent && this.selectionHandler.handleSelection(
                datum,
                mouseEvent.ctrlKey);
        });
    }

    protected bindClearCatcher() {
        // ...
    }

    protected bindContextMenu() {
        const {
            elementsSelection
        } = this.options;

        elementsSelection.on("contextmenu", (datum) => {
            const event: MouseEvent = (getEvent() as MouseEvent) || window.event as MouseEvent;
            if (event) {
                this.selectionHandler.handleContextMenu(
                    datum,
                    {
                        x: event.clientX,
                        y: event.clientY
                    });
                event.preventDefault();
            }
        });
    }

    public bindEvents(
        options: BaseBehaviorOptions<SelectableDataPointType>,
        selectionHandler: ISelectionHandler): void {

        this.options = options;
        this.selectionHandler = selectionHandler;

        this.bindClick();
        this.bindClearCatcher();
        this.bindContextMenu();
    }

    public renderSelection(hasSelection: boolean): void {
        console.log("renderSelection", this.options);
        this.options.elementsSelection.style("opacity", (identity: any) => {
            if (identity.selected) {
                console.log("categorY:", identity);
                return 1;
            } else {
                console.log("categorY2:", identity);
                return 0.5;
            }
        });

    }


}