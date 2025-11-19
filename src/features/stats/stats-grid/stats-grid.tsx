import { AgGridReact } from 'ag-grid-react';
import { useCallback, useEffect, useState } from 'react';
import { IStatItem } from '../../../types/stats.types';
import { STATS_API, StatsApi } from '../../../api/stats.api';
import { ColDef, GridReadyEvent, IServerSideDatasource } from 'ag-grid-enterprise';
import { useSearchParams } from 'react-router-dom';
import { Metrics } from '../stats.const';
import { statsGridColumnsFactory } from './stats-grid.columns';
import './stats-grid.scss';
import { autoGroupColumnDef, theme } from './config';
import { getServerSideDatasource } from '../../../api/tryRepeat';

export function StatsGrid() {
    const [columnDefs, setColumnDefs] = useState<ColDef<IStatItem>[]>([]);
    const [searchParams] = useSearchParams();
    const metric = searchParams.get('metric') ?? Metrics.cost;

    useEffect(() => {
        const dates = Array.from({ length: 30 }, (_, i) => new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
        setColumnDefs(statsGridColumnsFactory(metric, dates));
    }, [metric]);

    const onGridReady = useCallback((params: GridReadyEvent) => {
        STATS_API.getFull().then((data) => {
            const datasource = getServerSideDatasource(STATS_API);
            params.api!.setGridOption('serverSideDatasource', datasource);
        });
    }, []);

    return (
        <div className='stats-grid ag-theme-balham'>
            <AgGridReact
                groupHideParentOfSingleChild='leafGroupsOnly'
                autoGroupColumnDef={autoGroupColumnDef}
                theme={theme}
                rowModelType={'serverSide'}
                onGridReady={onGridReady}
                columnDefs={columnDefs}
            ></AgGridReact>
        </div>
    );
}
