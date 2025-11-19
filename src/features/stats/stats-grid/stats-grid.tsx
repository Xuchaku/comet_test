import { AgGridReact } from 'ag-grid-react';
import { useEffect, useId, useState } from 'react';
import { IStatItem, Levels } from '../../../types/stats.types';
import { STATS_API } from '../../../api/stats.api';
import { ColDef, themeBalham } from 'ag-grid-enterprise';
import { useSearchParams } from 'react-router-dom';
import { Metrics } from '../stats.const';
import { statsGridColumnsFactory } from './stats-grid.columns';
import './stats-grid.scss';
import { autoGroupColumnDef, theme } from './config';
import { flushSync } from 'react-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../../dbs/stats.db';

export function StatsGrid() {
    const supplier = useLiveQuery(() => db.supplier.orderBy('').first());
    const brand = useLiveQuery(() => db.brand.orderBy('').first());
    const type = useLiveQuery(() => db.type.orderBy('').first());
    const article = useLiveQuery(() => db.article.orderBy('').first());

    const [rowData, setRowData] = useState<IStatItem[] | null>(null);
    const [columnDefs, setColumnDefs] = useState<ColDef<IStatItem>[]>([]);
    const [searchParams] = useSearchParams();
    const id = useId();
    const metric = searchParams.get('metric') ?? Metrics.cost;

    useEffect(() => {
        console.log('prerer');
        const dates = Array.from({ length: 30 }, (_, i) => new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
        setColumnDefs(statsGridColumnsFactory(metric, dates, { article, supplier, brand, type }));
    }, [metric, supplier, brand, type, article]);

    useEffect(() => {
        console.log('zapros');
        STATS_API.getFull().then((data) => {
            flushSync(() => setRowData(data));
            STATS_API.registerSubject<Record<Levels, IStatItem[]>>(id).subscribe((data: Record<Levels, IStatItem[]>) =>
                setRowData(article || data.article),
            );
        });
    }, []);

    return (
        <div className='stats-grid ag-theme-balham'>
            <AgGridReact
                groupHideParentOfSingleChild='leafGroupsOnly'
                autoGroupColumnDef={autoGroupColumnDef}
                theme={theme}
                rowData={rowData}
                columnDefs={columnDefs}
            ></AgGridReact>
        </div>
    );
}
