import React, { FC } from 'react';
import { useStyles2 } from '@grafana/ui';
import { FormAmRoute } from '../../types/amroutes';
import { getGridStyles } from './gridStyles';

export interface AmRootRouteReadProps {
  routes: FormAmRoute;
}

export const AmRootRouteRead: FC<AmRootRouteReadProps> = ({ routes }) => {
  const styles = useStyles2(getGridStyles);

  const receiver = routes.receiver || '-';
  const groupBy = routes.groupBy.join(', ') || '-';
  const groupWait = routes.groupWaitValue ? `${routes.groupWaitValue}${routes.groupWaitValueType}` : '-';
  const groupInterval = routes.groupIntervalValue
    ? `${routes.groupIntervalValue}${routes.groupIntervalValueType}`
    : '-';
  const repeatInterval = routes.repeatIntervalValue
    ? `${routes.repeatIntervalValue}${routes.repeatIntervalValueType}`
    : '-';

  return (
    <div className={styles.container}>
      <div className={styles.titleCell}>Receiver channel</div>
      <div className={styles.valueCell}>{receiver}</div>
      <div className={styles.titleCell}>Group by</div>
      <div className={styles.valueCell}>{groupBy}</div>
      <div className={styles.titleCell}>Timings</div>
      <div className={styles.valueCell}>
        Group wait: {groupWait} | Group interval: {groupInterval} | Repeat interval: {repeatInterval}
      </div>
    </div>
  );
};
