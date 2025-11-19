import { ColDef, ColDefField, ValueFormatterParams, ValueGetterParams } from 'ag-grid-enterprise';
import { IStatItem, ORDERED_LEVELS } from '../../../types/stats.types';
import { METADATA_LABELS } from '../stats.const';
import { BRANDS, SUPPLIERS, TYPES } from '../../../api/mock';

interface AggregatedData {
    article?: IStatItem[];
    supplier?: IStatItem[];
    brand?: IStatItem[];
    type?: IStatItem[];
}

const valueGetterExt =
    <T extends IStatItem>(dataDb: AggregatedData, metric: string, field: 'sums' | 'average') =>
    (params: ValueGetterParams<T>) => {
        const { supplier, brand, type } = dataDb;

        const keyValue = params.node?.key as string;
        if (SUPPLIERS.includes(keyValue)) {
            const targetSupplierRow = supplier?.find((item) => item.supplier === keyValue);
            return targetSupplierRow?.[field]?.[metric as keyof IStatItem['sums' | 'average']] ?? 0;
        } else if (BRANDS.includes(keyValue)) {
            const parentKeySupplier = params.node?.parent?.key;
            const targetBrandRow = brand?.find((item) => item.brand === keyValue && item.supplier === parentKeySupplier);
            return targetBrandRow?.[field]?.[metric as keyof IStatItem['sums' | 'average']] ?? 0;
        } else if (TYPES.includes(keyValue)) {
            const parentKeySupplier = params.node?.parent?.parent?.key;
            const parentKeyBrand = params.node?.parent?.key;
            const targetTypeRow = type?.find(
                (item) => item.type === keyValue && item.brand === parentKeyBrand && item.supplier === parentKeySupplier,
            );
            return targetTypeRow?.[field]?.[metric as keyof IStatItem['sums' | 'average']] ?? 0;
        } else {
            return params.data?.[field]?.[metric as keyof IStatItem['sums' | 'average']] ?? 0;
        }
    };

export function statsGridColumnsFactory<T extends IStatItem>(metric: string, dates: string[], dataDb: AggregatedData) {
    const metadataColumns: ColDef<T>[] = ORDERED_LEVELS.map((level, index) => ({
        colId: level,
        headerName: METADATA_LABELS[level],
        field: level as ColDefField<T>,
        rowGroup: true,
        rowGroupIndex: index,
        initialHide: true,
    }));

    const sumColumn: ColDef<T> = {
        colId: 'sums',
        headerName: 'Sum',
        valueGetter: valueGetterExt(dataDb, metric, 'sums'),
        valueFormatter: (params: ValueFormatterParams<T>) => {
            return params.value?.toLocaleString() ?? '';
        },
    };
    const averageColumn: ColDef<T> = {
        colId: 'average',
        headerName: 'Average',
        valueGetter: valueGetterExt(dataDb, metric, 'average'),
        valueFormatter: (params: ValueFormatterParams<T>) => {
            return params.value?.toLocaleString() ?? '';
        },
    };

    const datesColumns: ColDef<T>[] = dates.map((date, index) => ({
        headerName: date,
        colId: `${index}`,
        valueGetter: (params: ValueGetterParams<T>) => {
            const { supplier, brand, type } = dataDb;
            const keyValue = params.node?.key as string;
            if (SUPPLIERS.includes(keyValue)) {
                const targetSupplierRow = supplier?.find((item) => item.supplier === keyValue);
                return targetSupplierRow?.[metric as 'cost' | 'orders' | 'returns' | 'revenue' | 'buyouts']?.[index] ?? 0;
            } else if (BRANDS.includes(keyValue)) {
                const parentKeySupplier = params.node?.parent?.key;
                const targetBrandRow = brand?.find((item) => item.brand === keyValue && item.supplier === parentKeySupplier);
                return targetBrandRow?.[metric as 'cost' | 'orders' | 'returns' | 'revenue' | 'buyouts']?.[index] ?? 0;
            } else if (TYPES.includes(keyValue)) {
                const parentKeySupplier = params.node?.parent?.parent?.key;
                const parentKeyBrand = params.node?.parent?.key;
                const targetTypeRow = type?.find(
                    (item) => item.type === keyValue && item.brand === parentKeyBrand && item.supplier === parentKeySupplier,
                );
                return targetTypeRow?.[metric as 'cost' | 'orders' | 'returns' | 'revenue' | 'buyouts']?.[index] ?? 0;
            } else {
                return params.data?.[metric as 'cost' | 'orders' | 'returns' | 'revenue' | 'buyouts']?.[index] ?? 0;
            }
        },
        valueFormatter: (params: ValueFormatterParams<T>) => {
            return params.value?.toLocaleString() ?? '';
        },
    }));

    return [...metadataColumns, sumColumn, averageColumn, ...datesColumns];
}
