import { AdStatsDatabase, db } from '../dbs/stats.db';
import { ActionWorker } from '../types/action.types';
import { IStatItem, Levels } from '../types/stats.types';
import { produce } from 'immer';

export const BRANDS = ['Nike', 'Adidas', 'ARMADABOOTS', 'Ecco', 'Asolo', 'Lomer'];

export const TYPES = ['Кеды', 'Кроссовки', 'Ботинки'];

export const SUPPLIERS = ['ООО Обувной барыга', 'ООО Пупа и Лупа', 'ЗАО Госбюджетраспил'];

function getRandomIndexFromArray<T>(array: T[]) {
    return Math.floor(Math.random() * array.length);
}

class ApiWorker {
    constructor() {
        self.addEventListener('message', this.handleMessage.bind(this));
    }

    private async handleMessage(event: MessageEvent<{ action: ActionWorker; size?: number; requestId: string; data?: IStatItem[] }>) {
        const { action, size, requestId, data } = event.data;

        try {
            switch (action) {
                case ActionWorker.GET_STATS_DATA:
                    const result = await this.genStatsData(size);
                    self.postMessage({ requestId, result, action });
                    console.log('getStatsData', requestId);
                    break;
                case ActionWorker.CALC_STATS_DATA:
                    const resultData = this.calculateStatsData(data);
                    self.postMessage({ action, data: resultData });
                    break;
                case ActionWorker.GET_AGGREGATED_DATA:
                    const aggregatedData = await this.getDataFromDb(db);
                    self.postMessage({ action, data: aggregatedData });
                    break;
                default:
                    throw new Error(`Unknown action: ${action}`);
            }
        } catch (error) {
            throw error;
        }
    }

    private async getDataFromDb(db?: AdStatsDatabase) {
        const aggregatedData: Record<Levels, IStatItem[]> = {
            [Levels.article]: [],
            [Levels.type]: [],
            [Levels.brand]: [],
            [Levels.supplier]: [],
        };
        const dataFromDb = await db?.getAggregatedData();
        return dataFromDb ?? aggregatedData;
    }

    private calculateStatsData(data?: IStatItem[]) {
        const calculatedStats: Record<Levels, IStatItem[]> = {
            [Levels.article]: [],
            [Levels.type]: [],
            [Levels.brand]: [],
            [Levels.supplier]: [],
        };
        const metrics: (keyof IStatItem['sums'])[] = ['cost', 'orders', 'returns', 'revenue', 'buyouts'];
        if (!data) return null;
        const articlesBySuppliers: IStatItem[] = [];
        const articlesBySuppliersBrands: IStatItem[] = [];
        const articlesBySuppliersBrandsTypes: IStatItem[] = [];
        const articles = produce(data, (draft) => {
            draft.map((item) => {
                item.buyouts = item.orders.map((curr, index) => curr - item.returns[index]);
                item.revenue = item.cost.map((curr, index) => curr * item.buyouts[index]);
                item.sums = {
                    cost: 0,
                    orders: 0,
                    returns: 0,
                    revenue: 0,
                    buyouts: 0,
                };
                item.average = {
                    cost: 0,
                    orders: 0,
                    returns: 0,
                    revenue: 0,
                    buyouts: 0,
                };
                for (const metric of metrics) {
                    item.sums[metric] = item[metric].reduce((prev, curr) => prev + curr, 0);
                    item.average[metric] = item.sums[metric] / item[metric].length;
                }
                return item;
            });
        });

        for (const supplier of SUPPLIERS) {
            const articlesBySupplier = produce(
                articles.filter((item) => item.supplier === supplier),
                (draft) => {
                    return draft.reduce(
                        (accum, curr) => ({
                            ...accum,
                            cost: accum.cost.map((item, index) => item + curr.cost[index]),
                            orders: accum.orders.map((item, index) => item + curr.orders[index]),
                            returns: accum.returns.map((item, index) => item + curr.returns[index]),
                            revenue: accum.revenue.map((item, index) => item + curr.revenue[index]),
                            buyouts: accum.buyouts.map((item, index) => item + curr.buyouts[index]),
                            sums: {
                                cost: accum.sums.cost + curr.sums.cost,
                                orders: accum.sums.orders + curr.sums.orders,
                                returns: accum.sums.returns + curr.sums.returns,
                                revenue: accum.sums.revenue + curr.sums.revenue,
                                buyouts: accum.sums.buyouts + curr.sums.buyouts,
                            },
                        }),
                        { ...draft[0] },
                    );
                },
            ) as IStatItem;
            articlesBySuppliers.push(articlesBySupplier);
        }

        for (const supplier of SUPPLIERS) {
            for (const brand of BRANDS) {
                const articlesBySupplierBrand = produce(
                    articles.filter((item) => item.supplier === supplier && item.brand === brand),
                    (draft) => {
                        return draft.reduce(
                            (accum, curr) => ({
                                ...accum,
                                cost: accum.cost.map((item, index) => item + curr.cost[index]),
                                orders: accum.orders.map((item, index) => item + curr.orders[index]),
                                returns: accum.returns.map((item, index) => item + curr.returns[index]),
                                revenue: accum.revenue.map((item, index) => item + curr.revenue[index]),
                                buyouts: accum.buyouts.map((item, index) => item + curr.buyouts[index]),
                                sums: {
                                    cost: accum.sums.cost + curr.sums.cost,
                                    orders: accum.sums.orders + curr.sums.orders,
                                    returns: accum.sums.returns + curr.sums.returns,
                                    revenue: accum.sums.revenue + curr.sums.revenue,
                                    buyouts: accum.sums.buyouts + curr.sums.buyouts,
                                },
                            }),
                            { ...draft[0] },
                        );
                    },
                ) as IStatItem;
                articlesBySuppliersBrands.push(articlesBySupplierBrand);
            }
        }

        for (const supplier of SUPPLIERS) {
            for (const brand of BRANDS) {
                for (const typeItem of TYPES) {
                    const articlesBySupplierBrandType = produce(
                        articles.filter((item) => item.supplier === supplier && item.brand === brand && item.type === typeItem),
                        (draft) => {
                            return draft.reduce(
                                (accum, curr) => ({
                                    ...accum,
                                    cost: accum.cost.map((item, index) => item + curr.cost[index]),
                                    orders: accum.orders.map((item, index) => item + curr.orders[index]),
                                    returns: accum.returns.map((item, index) => item + curr.returns[index]),
                                    revenue: accum.revenue.map((item, index) => item + curr.revenue[index]),
                                    buyouts: accum.buyouts.map((item, index) => item + curr.buyouts[index]),
                                    sums: {
                                        cost: accum.sums.cost + curr.sums.cost,
                                        orders: accum.sums.orders + curr.sums.orders,
                                        returns: accum.sums.returns + curr.sums.returns,
                                        revenue: accum.sums.revenue + curr.sums.revenue,
                                        buyouts: accum.sums.buyouts + curr.sums.buyouts,
                                    },
                                }),
                                { ...draft[0] },
                            );
                        },
                    ) as IStatItem;
                    articlesBySuppliersBrandsTypes.push(articlesBySupplierBrandType);
                }
            }
        }

        calculatedStats.article = articles;
        calculatedStats.supplier = articlesBySuppliers;
        calculatedStats.brand = articlesBySuppliersBrands;
        calculatedStats.type = articlesBySuppliersBrandsTypes;

        return calculatedStats;
    }

    private genStatsData(size: number = 1e5) {
        const pow = Math.log10(size);
        const items: IStatItem[] = [];

        for (let i = 0; i < size; i++) {
            const brand = BRANDS[getRandomIndexFromArray(BRANDS)];
            const type = TYPES[getRandomIndexFromArray(TYPES)];
            const supplier = SUPPLIERS[getRandomIndexFromArray(SUPPLIERS)];
            const cost: number[] = [];
            const orders: number[] = [];
            const returns: number[] = [];

            for (let day = 0; day < 30; day++) {
                const dayCost = Math.round(Math.random() * 95000) + 5000;
                const dayOrders = Math.round(Math.random() * 100);
                cost.push(dayCost);
                orders.push(dayOrders);
                returns.push(Math.round(Math.random() * dayOrders * 0.5));
            }

            const lastUpdateShift = Math.round(Math.random() * 30) * 24 * 60 * 60 * 1000;
            const lastUpdate = new Date(Date.now() - lastUpdateShift).toISOString();

            items.push({
                article: `${i}`.padStart(pow),
                type,
                brand,
                supplier,
                cost,
                orders,
                returns,
                lastUpdate,
            });
        }

        return items;
    }
}

new ApiWorker();
