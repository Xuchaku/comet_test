import { ActionWorker } from '../types/action.types';
import { Subject } from 'rxjs';
import { IStatItem, Levels } from '../types/stats.types';
import { db } from '../dbs/stats.db';

class StatsApi {
    private getRequestId() {
        return Math.random().toString(36).substring(2, 15);
    }
    private worker: Worker;
    private resolvedMessages = new Map<string, IStatItem[]>();
    private subjectSubscribers = new Map<string, Subject<any>>();

    constructor() {
        this.worker = new Worker(new URL('./mock.ts', import.meta.url), { type: 'module' });
        this.worker.onmessage = (event) => {
            switch (event.data.action) {
                case ActionWorker.GET_STATS_DATA:
                    this.resolvedMessages.set(event.data.requestId, event.data.result);
                    break;
                case ActionWorker.CALC_STATS_DATA:
                    console.log(event.data.data);
                    db.saveAggregatedData(event.data.data as Record<Levels, IStatItem[]>);
                    this.dispatchCalculatedStats(event.data.data as Record<Levels, IStatItem[]>);
                    break;
                case ActionWorker.GET_AGGREGATED_DATA:
                    console.log('from aggr', event.data.data);
                    //this.dispatchCalculatedStats(event.data.data);
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

    //выше воркер притворяется сервером, не обращай внимания
    private async calculateStats(stats: IStatItem[]) {
        console.log(db.isExpired());
        if (db.isExpired()) {
            this.worker.postMessage({ action: ActionWorker.CALC_STATS_DATA, data: stats });
        } else {
            this.worker.postMessage({ action: ActionWorker.GET_AGGREGATED_DATA });
        }
    }

    private dispatchCalculatedStats(stats: Record<Levels, IStatItem[]>) {
        this.subjectSubscribers.forEach((subject) => {
            subject.next(stats);
        });
    }

    public getShort(): Promise<IStatItem[]> {
        return this.request({ action: ActionWorker.GET_STATS_DATA, size: 25 });
    }

    public getFull(): Promise<IStatItem[]> {
        return this.request({ action: ActionWorker.GET_STATS_DATA });
    }

    public getVersion(): Promise<number> {
        return new Promise((resolve) => {
            resolve(1);
        });
    }

    public registerSubject<T>(id: string): Subject<T> {
        if (this.subjectSubscribers.has(id)) {
            return this.subjectSubscribers.get(id) as Subject<T>;
        }
        const subject = new Subject<T>();
        this.subjectSubscribers.set(id, subject);
        return subject;
    }
}

export const STATS_API = new StatsApi();
