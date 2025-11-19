import { ColDef, themeBalham } from 'ag-grid-enterprise';
import { IStatItem } from '../../../types/stats.types';

export const autoGroupColumnDef: ColDef<IStatItem, any> = {
    menuTabs: ['columnsMenuTab'],
    pinned: 'left',
    headerName: 'Group Articles',
    field: 'article',
};

export const theme = themeBalham.withParams({
    backgroundColor: 'var(--bs-body-bg)',
    foregroundColor: 'var(--bs-body-color)',
    browserColorScheme: 'light',
});
