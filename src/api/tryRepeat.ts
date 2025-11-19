import { IServerSideDatasource, IServerSideGetRowsParams, IServerSideGetRowsRequest } from 'ag-grid-enterprise';
import { IStatItem } from '../types/stats.types';
import { StatsApi } from './stats.api';

export const tryRepeat = (func: (req: IServerSideGetRowsRequest) => IStatItem[] | null, max: number = 100) => {
    let cnt = 0;

    return function repeatFunc(params: IServerSideGetRowsParams<any, any>) {
        new Promise((resolve, rejecet) => {
            if (cnt >= max) rejecet(params.fail());
            else {
                cnt++;
                const res = func(params.request);
                if (!res) {
                    setTimeout(() => repeatFunc(params), 750);
                } else {
                    resolve(
                        params.success({
                            rowData: res,
                        }),
                    );
                }
            }
        });
    };
};

export const getServerSideDatasource: (server: StatsApi) => IServerSideDatasource = (server: StatsApi) => {
    return {
        getRows: (params) => {
            const requestRepet = tryRepeat(server.getPartionData.bind(server));
            requestRepet(params);
        },
    };
};
