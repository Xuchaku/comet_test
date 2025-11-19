import Dixie, { Table } from 'dexie';
import { IStatItem, Levels } from '../types/stats.types';

export class AdStatsDatabase extends Dixie {
    [Levels.supplier]!: Table<IStatItem[]>;
    [Levels.article]!: Table<IStatItem[]>;
    [Levels.brand]!: Table<IStatItem[]>;
    [Levels.type]!: Table<IStatItem[]>;

    constructor(user_uuid: string) {
        super(user_uuid);

        this.version(1).stores({
            [Levels.article]: '++',
            [Levels.brand]: '++',
            [Levels.type]: '++',
            [Levels.supplier]: '++',
        });
    }

    public isExpired() {
        const lastUpdateDate = localStorage.getItem('date');
        return lastUpdateDate ? Date.now() - new Date(lastUpdateDate).getTime() > 24 * 60 * 60 * 1000 : true;
    }

    public async getAggregatedData(): Promise<Record<Levels, IStatItem[]>> {
        const aggregatedData: Record<Levels, IStatItem[]> = {
            [Levels.article]: [],
            [Levels.type]: [],
            [Levels.brand]: [],
            [Levels.supplier]: [],
        };

        const dataFromDb = await Promise.all([
            this.article.orderBy('').first(),
            this.type.orderBy('').first(),
            this.brand.orderBy('').first(),
            this.supplier.orderBy('').first(),
        ]);
        aggregatedData[Levels.article] = dataFromDb[0] ?? [];
        aggregatedData[Levels.type] = dataFromDb[1] ?? [];
        aggregatedData[Levels.brand] = dataFromDb[2] ?? [];
        aggregatedData[Levels.supplier] = dataFromDb[3] ?? [];

        return aggregatedData;
    }

    public saveAggregatedData(data: Record<Levels, IStatItem[]>) {
        const lastUpdateDate = localStorage.getItem('date');
        if (!lastUpdateDate) {
            localStorage.setItem('date', new Date().toISOString());
        } else if (this.isExpired()) {
            localStorage.setItem('date', new Date().toISOString());
        } else {
            return;
        }

        for (const [level, items] of Object.entries(data)) {
            this[level as Levels].add(items);
        }
    }
}

export const db = new AdStatsDatabase('intaterum');
