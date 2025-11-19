import { produce } from 'immer';
import { IStatItem } from '../types/stats.types';

export const aggregateReduce = (filteredItems: IStatItem[]) => {
    const item = produce(filteredItems, (draft) => {
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
                average: {
                    cost: accum.average.cost + curr.average.cost / accum.cost.length,
                    orders: accum.average.orders + curr.average.orders / accum.orders.length,
                    returns: accum.average.returns + curr.average.returns / accum.returns.length,
                    revenue: accum.average.revenue + curr.average.revenue / accum.revenue.length,
                    buyouts: accum.average.buyouts + curr.average.buyouts / accum.buyouts.length,
                },
            }),
            { ...draft[0] },
        );
    }) as IStatItem;
    return item;
};
