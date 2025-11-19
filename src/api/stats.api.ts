import { ActionWorker } from '../types/action.types';
import { IStatItem, Levels } from '../types/stats.types';
import { db } from '../dbs/stats.db';
import { IServerSideGetRowsRequest } from 'ag-grid-enterprise';

export class StatsApi {
    private getRequestId() {
        return Math.random().toString(36).substring(2, 15);
    }
    private worker: Worker;
    private resolvedMessages = new Map<string, IStatItem[]>();
    private cachedData: Record<Levels, IStatItem[]> = {
        [Levels.article]: [],
        [Levels.type]: [],
        [Levels.brand]: [],
        [Levels.supplier]: [],
    };
    private isCalculatedData: boolean = false;

    constructor() {
        this.worker = new Worker(new URL('./mock.ts', import.meta.url), { type: 'module' });
        this.worker.onmessage = (event) => {
            switch (event.data.action) {
                case ActionWorker.GET_STATS_DATA:
                    this.resolvedMessages.set(event.data.requestId, event.data.result);
                    break;
                case ActionWorker.CALC_STATS_DATA:
                    db.saveAggregatedData(event.data.data as Record<Levels, IStatItem[]>);
                    this.dispatchCalculatedStats(event.data.data as Record<Levels, IStatItem[]>);
                    break;
                case ActionWorker.GET_AGGREGATED_DATA:
                    this.dispatchCalculatedStats(event.data.data);
                    break;
            }
        };
    }

    private request(messageData: { action: ActionWorker; size?: number }) {
        const requestId = this.getRequestId();
        return new Promise<IStatItem[]>((resolve, reject) => {
            this.worker.postMessage({ ...messageData, requestId });

            setInterval(() => {
                if (this.resolvedMessages.has(requestId)) {
                    resolve(this.resolvedMessages.get(requestId)!);
                    this.calculateStats(this.resolvedMessages.get(requestId)!);
                    this.resolvedMessages.delete(requestId);
                }
            }, 1000);
        });
    }

    private dispatchCalculatedStats(data: Record<Levels, IStatItem[]>) {
        this.cachedData = data;
        this.isCalculatedData = true;
    }

    public getPartionData(req: IServerSideGetRowsRequest) {
        const { groupKeys } = req;

        if (this.isCalculatedData) {
            if (groupKeys.length === 0) return this.cachedData.supplier;

            if (groupKeys.length === 1) {
                return this.cachedData.brand.filter((item) => item.supplier === groupKeys[0]);
            }
            if (groupKeys.length === 2) {
                return this.cachedData.type.filter((item) => item.supplier === groupKeys[0] && item.brand === groupKeys[1]);
            }
            if (groupKeys.length === 3) {
                return this.cachedData.article.filter(
                    (item) => item.supplier === groupKeys[0] && item.brand === groupKeys[1] && item.type === groupKeys[2],
                );
            }
        }
        return null;
    }

    //выше воркер притворяется сервером, не обращай внимания
    private async calculateStats(stats: IStatItem[]) {
        if (db.isExpired()) {
            this.worker.postMessage({ action: ActionWorker.CALC_STATS_DATA, data: stats });
        } else {
            this.worker.postMessage({ action: ActionWorker.GET_AGGREGATED_DATA });
        }
    }

    public getShort(): Promise<IStatItem[]> {
        return this.request({ action: ActionWorker.GET_STATS_DATA, size: 1000 });
    }

    public getFull(): Promise<IStatItem[]> {
        return this.request({ action: ActionWorker.GET_STATS_DATA });
    }

    public getVersion(): Promise<number> {
        return new Promise((resolve) => {
            resolve(1);
        });
    }
}

export const STATS_API = new StatsApi();
