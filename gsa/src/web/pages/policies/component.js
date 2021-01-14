/* Copyright (C) 2019-2020 Greenbone Networks GmbH
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Affero General Public License
 * as published by the Free Software Foundation, either version 3
 * of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see <http://www.gnu.org/licenses/>.
 */

import React, {useReducer, useEffect, useCallback} from 'react';
import {connect, useDispatch} from 'react-redux';

import _ from 'gmp/locale';

import {ALL_FILTER} from 'gmp/models/filter';
import {DEFAULT_MIN_QOD} from 'gmp/models/audit';

import {
  ospScannersFilter,
  OPENVAS_DEFAULT_SCANNER_ID,
  OPENVAS_SCANNER_TYPE,
  GREENBONE_SENSOR_SCANNER_TYPE,
} from 'gmp/models/scanner';

import {YES_VALUE, NO_VALUE} from 'gmp/parser';

import {isDefined} from 'gmp/utils/identity';
import {shorten} from 'gmp/utils/string';
import {selectSaveId} from 'gmp/utils/id';

import EntityComponent from 'web/entity/component';

import AlertComponent from 'web/pages/alerts/component';

import AuditDialog from 'web/pages/audits/dialog';

import {createSelectedNvts} from 'web/pages/scanconfigs/component';
import EditPolicyFamilyDialog from 'web/pages/scanconfigs/editconfigfamilydialog';
import EditPolicyDialog from 'web/pages/scanconfigs/editdialog';
import EditNvtDetailsDialog from 'web/pages/scanconfigs/editnvtdetailsdialog';
import ImportDialog from 'web/pages/scanconfigs/importdialog';

import ScheduleComponent from 'web/pages/schedules/component';

import TargetComponent from 'web/pages/targets/component';

import {
  loadEntities as loadAlerts,
  selector as alertSelector,
} from 'web/store/entities/alerts';

import {
  loadEntities as loadScannersFromStore,
  selector as scannerSelector,
} from 'web/store/entities/scanners';

import {
  loadEntities as loadSchedules,
  selector as scheduleSelector,
} from 'web/store/entities/schedules';

import {
  loadEntities as loadTargets,
  selector as targetSelector,
} from 'web/store/entities/targets';

import {getTimezone} from 'web/store/usersettings/selectors';

import {loadUserSettingDefaults} from 'web/store/usersettings/defaults/actions';
import {getUserSettingsDefaults} from 'web/store/usersettings/defaults/selectors';

import compose from 'web/utils/compose';
import PropTypes from 'web/utils/proptypes';
import stateReducer, {updateState} from 'web/utils/stateReducer';
import withCapabilities from 'web/utils/withCapabilities';
import useGmp from 'web/utils/useGmp';

import PolicyDialog from './dialog';

const PolicyComponent = props => {
  const dispatch = useDispatch();
  const gmp = useGmp();
  const [state, dispatchState] = useReducer(stateReducer, {
    createPolicyDialogVisible: false,
    editPolicyDialogVisible: false,
    editPolicyFamilyDialogVisible: false,
    editNvtDetailsDialogVisible: false,
    createAuditDialogVisible: false,
    importDialogVisible: false,
  });

  const loadScannersAction = () =>
    dispatch(loadScannersFromStore(gmp)(ALL_FILTER));
  const loadAlertsAction = () => dispatch(loadAlerts(gmp)(ALL_FILTER));
  const loadSchedulesAction = () => dispatch(loadSchedules(gmp)(ALL_FILTER));
  const loadTargetsAction = () => dispatch(loadTargets(gmp)(ALL_FILTER));
  const loadUserSettingsDefaultsAction = useCallback(
    () => dispatch(loadUserSettingDefaults(gmp)()),
    [dispatch, gmp],
  );

  const handleChange = (value, name) => {
    dispatchState(
      updateState({
        [name]: value,
      }),
    );
  };

  const handleAlertCreated = alertId => {
    loadAlertsAction();

    dispatchState(
      updateState({
        alertIds: [alertId, ...state.alertIds],
      }),
    );
  };

  const handleScheduleCreated = scheduleId => {
    loadSchedulesAction();

    dispatchState(updateState({scheduleId}));
  };

  const handleTargetCreated = targetId => {
    loadTargetsAction();

    dispatchState(updateState({targetId}));
  };

  const openEditPolicyDialog = policy => {
    dispatchState(
      updateState({
        policy, // put policy from list with reduced data in state
        editPolicyDialogVisible: true,
        title: _('Edit Policy {{name}}', {name: shorten(policy.name)}),
      }),
    );

    loadEditPolicySettings(policy.id);

    loadScanners();

    handleInteraction();
  };

  const closeEditPolicyDialog = () => {
    dispatchState(
      updateState({
        editPolicyDialogVisible: false,
        policy: undefined,
        families: undefined,
      }),
    );
  };

  const handleCloseEditPolicyDialog = () => {
    closeEditPolicyDialog();
    handleInteraction();
  };

  const handleSavePolicy = d => {
    const {policy} = state;

    handleInteraction();
    const {name, comment, id} = d;
    let saveData = d;
    if (policy.isInUse()) {
      saveData = {name, comment, id};
    }

    return gmp.policy.save(saveData).then(() => closeEditPolicyDialog());
  };

  const openCreatePolicyDialog = () => {
    loadScanners();

    dispatchState(
      updateState({
        createPolicyDialogVisible: true,
      }),
    );

    handleInteraction();
  };

  const closeCreatePolicyDialog = () => {
    dispatchState(
      updateState({
        createPolicyDialogVisible: false,
      }),
    );
  };

  const handleCloseCreatePolicyDialog = () => {
    closeCreatePolicyDialog();
    handleInteraction();
  };

  const openImportDialog = () => {
    dispatchState(
      updateState({
        importDialogVisible: true,
      }),
    );
    handleInteraction();
  };

  const closeImportDialog = () => {
    dispatchState(
      updateState({
        importDialogVisible: false,
      }),
    );
  };

  const handleCloseImportDialog = () => {
    closeImportDialog();
    handleInteraction();
  };

  const openCreateAuditDialog = policy => {
    loadAlertsAction();
    loadScannersAction();
    loadSchedulesAction();
    loadTargetsAction();

    const {defaultAlertId, defaultScheduleId, defaultTargetId} = props;

    const alertIds = isDefined(defaultAlertId) ? [defaultAlertId] : [];

    dispatchState(
      updateState({
        createAuditDialogVisible: true,
        alertIds,
        alterable: undefined,
        auto_delete: undefined,
        auto_delete_data: undefined,
        comment: '',
        policyId: isDefined(policy) ? policy.id : undefined,
        policyName: policy.name,
        hostsOrdering: undefined,
        id: undefined,
        in_assets: undefined,
        maxChecks: undefined,
        maxHosts: undefined,
        name: undefined,
        scheduleId: defaultScheduleId,
        schedulePeriods: undefined,
        sourceIface: undefined,
        targetId: defaultTargetId,
        title: _('New Audit'),
      }),
    );

    handleInteraction();
  };

  const closeCreateAuditDialog = () => {
    dispatchState(
      updateState({
        createAuditDialogVisible: false,
      }),
    );
  };

  const handleCloseCreateAuditDialog = () => {
    closeCreateAuditDialog();
    handleInteraction();
  };

  const handleSaveAudit = ({
    alertIds,
    alterable,
    auto_delete,
    auto_delete_data,
    comment,
    hostsOrdering,
    in_assets,
    maxChecks,
    maxHosts,
    name,
    scannerId = OPENVAS_DEFAULT_SCANNER_ID,
    scannerType = OPENVAS_SCANNER_TYPE,
    scheduleId,
    schedulePeriods,
    sourceIface,
    targetId,
  }) => {
    const {policyId} = state;

    const tagId = undefined;
    const addTag = NO_VALUE;

    const applyOverrides = YES_VALUE;
    const minQod = DEFAULT_MIN_QOD;

    handleInteraction();

    const {onCreated, onCreateError} = props;
    return gmp.audit
      .create({
        addTag,
        alertIds,
        alterable,
        applyOverrides,
        autoDelete: auto_delete,
        autoDeleteData: auto_delete_data,
        comment,
        policyId,
        hostsOrdering,
        inAssets: in_assets,
        maxChecks,
        maxHosts,
        minQod,
        name,
        scannerType,
        scannerId,
        scheduleId,
        schedulePeriods,
        sourceIface,
        tagId,
        targetId,
      })
      .then(onCreated, onCreateError)
      .then(() => closeCreateAuditDialog());
  };

  const openEditPolicyFamilyDialog = familyName => {
    handleInteraction();

    dispatchState(
      updateState({
        editPolicyFamilyDialogVisible: true,
        editPolicyFamilyDialogTitle: _('Edit Policy Family {{name}}', {
          name: shorten(familyName),
        }),
        familyName,
      }),
    );

    return loadFamily(familyName);
  };

  const loadFamily = (familyName, silent = false) => {
    const {policy} = state;

    dispatchState(
      updateState({
        isLoadingFamily: silent ? state.isLoadingFamily : true,
      }),
    );

    return gmp.policy
      .editPolicyFamilySettings({
        id: policy.id,
        familyName,
      })
      .then(response => {
        const {data} = response;
        const {nvts} = data;

        const policyFamily = policy.families[familyName];
        const selected = createSelectedNvts(policyFamily, nvts);

        dispatchState(
          updateState({
            familyNvts: data.nvts,
            familySelectedNvts: selected,
            isLoadingFamily: false,
          }),
        );
      })
      .catch(error => {
        dispatchState(
          updateState({
            isLoadingFamily: false,
            selected: {}, // ensure selected is defined to stop loading indicator
          }),
        );
        throw error;
      });
  };

  const closeEditPolicyFamilyDialog = () => {
    dispatchState(
      updateState({
        editPolicyFamilyDialogVisible: false,
        familyName: undefined,
        selected: undefined,
      }),
    );
  };

  const handleCloseEditPolicyFamilyDialog = () => {
    closeEditPolicyFamilyDialog();
    handleInteraction();
  };

  const openEditNvtDetailsDialog = nvtOid => {
    handleInteraction();

    dispatchState(
      updateState({
        editNvtDetailsDialogVisible: true,
        editNvtDetailsDialogTitle: _('Edit Policy NVT {{nvtOid}}', {nvtOid}),
      }),
    );

    loadNvt(nvtOid);
  };

  const loadNvt = nvtOid => {
    const {policy} = state;

    dispatchState(
      updateState({
        isLoadingNvt: true,
      }),
    );

    return gmp.nvt
      .getConfigNvt({
        configId: policy.id,
        oid: nvtOid,
      })
      .then(response => {
        const {data: loadedNvt} = response;

        dispatchState(
          updateState({
            nvt: loadedNvt,
            editNvtDetailsDialogTitle: _('Edit Policy NVT {{name}}', {
              name: shorten(loadedNvt.name),
            }),
          }),
        );
      })
      .finally(() => {
        dispatchState(
          updateState({
            isLoadingNvt: false,
          }),
        );
      });
  };

  const closeEditNvtDetailsDialog = () => {
    dispatchState(
      updateState({
        editNvtDetailsDialogVisible: false,
        nvt: undefined,
      }),
    );
  };

  const handleCloseEditNvtDetailsDialog = () => {
    closeEditNvtDetailsDialog();
    handleInteraction();
  };

  const handleImportPolicy = data => {
    const {onImported, onImportError} = props;
    handleInteraction();

    return gmp.policy
      .import(data)
      .then(onImported, onImportError)
      .then(() => closeImportDialog());
  };

  const handleSavePolicyFamily = ({familyName, configId, selected}) => {
    handleInteraction();

    return gmp.policy
      .savePolicyFamily({
        id: configId,
        familyName,
        selected,
      })
      .then(() => loadEditPolicySettings(configId, true))
      .then(() => {
        closeEditPolicyFamilyDialog();
      });
  };

  const handleSavePolicyNvt = ({
    configId,
    timeout,
    useDefaultTimeout,
    nvtOid,
    preferenceValues,
  }) => {
    const {editPolicyFamilyDialogVisible, familyName} = state;

    handleInteraction();

    return gmp.policy
      .savePolicyNvt({
        id: configId,
        timeout: useDefaultTimeout === '1' ? undefined : timeout,
        oid: nvtOid,
        preferenceValues,
      })
      .then(() => {
        let promise;

        const policyPromise = loadPolicy(configId, true);

        if (editPolicyFamilyDialogVisible) {
          promise = loadFamily(familyName, true);
        } else {
          promise = policyPromise;
        }

        return promise;
      })
      .then(() => {
        closeEditNvtDetailsDialog();
      });
  };

  const handleInteraction = () => {
    const {onInteraction} = props;
    if (isDefined(onInteraction)) {
      onInteraction();
    }
  };

  const loadScanners = () => {
    dispatchState(
      updateState({
        isLoadingScanners: true,
      }),
    );

    return gmp.scanners
      .getAll()
      .then(response => {
        let {data: scanners} = response;
        scanners = scanners.filter(ospScannersFilter);
        return {
          scanners,
          scannerId: selectSaveId(scanners),
          isLoadingScanners: false,
        };
      })
      .finally(() => {
        dispatchState(
          updateState({
            isLoadingScanners: false,
          }),
        );
      });
  };

  const loadPolicy = (policyId, silent = false) => {
    dispatchState(
      updateState({
        isLoadingPolicy: silent ? state.isLoadingPolicy : true,
      }),
    );

    return gmp.policy
      .get({id: policyId})
      .then(response => {
        dispatchState(
          updateState({
            policy: response.data,
          }),
        );
      })
      .finally(() => {
        dispatchState(
          updateState({
            isLoadingPolicy: false,
          }),
        );
      });
  };

  const loadFamilies = (silent = false) => {
    dispatchState(
      updateState({
        isLoadingFamilies: silent ? state.isLoadingFamilies : true,
      }),
    );

    return gmp.nvtfamilies
      .get()
      .then(familiesResponse => {
        dispatchState(
          updateState({
            families: familiesResponse.data,
          }),
        );
      })
      .finally(() => {
        dispatchState(
          updateState({
            isLoadingFamilies: false,
          }),
        );
      });
  };

  const loadEditPolicySettings = (policyId, silent) => {
    return Promise.all([loadPolicy(policyId, silent), loadFamilies(silent)]);
  };

  const handleScannerChange = scannerId => {
    dispatchState(updateState({scannerId}));
  };

  const {
    alerts,
    children,
    schedules,
    targets,
    onCloned,
    onCloneError,
    onCreated,
    onCreateError,
    onDeleted,
    onDeleteError,
    onDownloaded,
    onDownloadError,
    onInteraction,
    onSaved,
    onSaveError,
  } = props;

  const {
    alertIds,
    alterable,
    auto_delete,
    auto_delete_data,
    comment,
    createPolicyDialogVisible,
    createAuditDialogVisible,
    editPolicyDialogVisible,
    editPolicyFamilyDialogVisible,
    editPolicyFamilyDialogTitle,
    editNvtDetailsDialogVisible,
    editNvtDetailsDialogTitle,
    families,
    familyName,
    familyNvts,
    familySelectedNvts,
    hostsOrdering,
    id,
    importDialogVisible,
    in_assets,
    isLoadingFamilies,
    isLoadingFamily,
    isLoadingNvt,
    isLoadingPolicy,
    isLoadingScanners,
    maxChecks,
    maxHosts,
    name,
    nvt,
    policy,
    policyName,
    policyId,
    scannerId,
    scanners,
    scheduleId,
    schedulePeriods,
    sourceIface,
    targetId,
    title,
  } = state;

  useEffect(() => {
    loadUserSettingsDefaultsAction();
  }, [loadUserSettingsDefaultsAction]);

  return (
    <React.Fragment>
      <EntityComponent
        name="policy"
        onCreated={onCreated}
        onCreateError={onCreateError}
        onCloned={onCloned}
        onCloneError={onCloneError}
        onDeleted={onDeleted}
        onDeleteError={onDeleteError}
        onDownloaded={onDownloaded}
        onDownloadError={onDownloadError}
        onInteraction={onInteraction}
        onSaved={onSaved}
        onSaveError={onSaveError}
      >
        {({save, ...other}) => (
          <React.Fragment>
            {children({
              ...other,
              createAudit: openCreateAuditDialog,
              create: openCreatePolicyDialog,
              edit: openEditPolicyDialog,
              import: openImportDialog,
            })}
            {createAuditDialogVisible && (
              <TargetComponent
                onCreated={handleTargetCreated}
                onInteraction={onInteraction}
              >
                {({create: createtarget}) => (
                  <AlertComponent
                    onCreated={handleAlertCreated}
                    onInteraction={onInteraction}
                  >
                    {({create: createalert}) => (
                      <ScheduleComponent
                        onCreated={handleScheduleCreated}
                        onInteraction={onInteraction}
                      >
                        {({create: createschedule}) => (
                          <AuditDialog
                            alerts={alerts}
                            alertIds={alertIds}
                            alterable={alterable}
                            auto_delete={auto_delete}
                            auto_delete_data={auto_delete_data}
                            comment={comment}
                            fromPolicy={true}
                            hostsOrdering={hostsOrdering}
                            id={id}
                            in_assets={in_assets}
                            isLoadingScanners={props.isLoadingScanners}
                            maxChecks={maxChecks}
                            maxHosts={maxHosts}
                            name={name}
                            policies={[{name: policyName, id: policyId}]}
                            policyId={policyId}
                            scannerId={scannerId}
                            scanners={props.scanners}
                            scheduleId={scheduleId}
                            schedulePeriods={schedulePeriods}
                            schedules={schedules}
                            sourceIface={sourceIface}
                            targetId={targetId}
                            targets={targets}
                            title={title}
                            onChange={handleChange}
                            onNewAlertClick={createalert}
                            onNewTargetClick={createtarget}
                            onNewScheduleClick={createschedule}
                            onClose={handleCloseCreateAuditDialog}
                            onSave={handleSaveAudit}
                            onScannerChange={handleScannerChange}
                          />
                        )}
                      </ScheduleComponent>
                    )}
                  </AlertComponent>
                )}
              </TargetComponent>
            )}
            {createPolicyDialogVisible && (
              <PolicyDialog
                onClose={handleCloseCreatePolicyDialog}
                onSave={d => {
                  handleInteraction();
                  return save(d).then(() => closeCreatePolicyDialog());
                }}
              />
            )}
            {editPolicyDialogVisible && (
              <EditPolicyDialog
                comment={policy.comment}
                configFamilies={policy.families}
                configId={policy.id}
                configIsInUse={policy.isInUse()}
                configType={policy.policy_type}
                editNvtDetailsTitle={_('Edit Policy NVT Details')}
                editNvtFamiliesTitle={_('Edit Policy Family')}
                families={families}
                isLoadingConfig={isLoadingPolicy}
                isLoadingFamilies={isLoadingFamilies}
                isLoadingScanners={isLoadingScanners}
                name={policy.name}
                nvtPreferences={policy.preferences.nvt}
                scannerId={scannerId}
                scannerPreferences={policy.preferences.scanner}
                scanners={scanners}
                title={title}
                usageType={'policy'}
                onClose={handleCloseEditPolicyDialog}
                onEditConfigFamilyClick={openEditPolicyFamilyDialog}
                onEditNvtDetailsClick={openEditNvtDetailsDialog}
                onSave={handleSavePolicy}
              />
            )}
          </React.Fragment>
        )}
      </EntityComponent>
      {importDialogVisible && (
        <ImportDialog
          title={_('Import Policy')}
          text={_('Import XML policy')}
          onClose={handleCloseImportDialog}
          onSave={handleImportPolicy}
        />
      )}
      {editPolicyFamilyDialogVisible && (
        <EditPolicyFamilyDialog
          configId={policy.id}
          configNameLabel={_('Policy')}
          configName={policy.name}
          familyName={familyName}
          isLoadingFamily={isLoadingFamily}
          nvts={familyNvts}
          selected={familySelectedNvts}
          title={editPolicyFamilyDialogTitle}
          onClose={handleCloseEditPolicyFamilyDialog}
          onEditNvtDetailsClick={openEditNvtDetailsDialog}
          onSave={handleSavePolicyFamily}
        />
      )}
      {editNvtDetailsDialogVisible && (
        <EditNvtDetailsDialog
          configId={policy.id}
          configName={policy.name}
          configNameLabel={_('Policy')}
          defaultTimeout={isDefined(nvt) ? nvt.defaultTimeout : undefined}
          isLoadingNvt={isLoadingNvt}
          nvtAffectedSoftware={isDefined(nvt) ? nvt.tags.affected : undefined}
          nvtCvssVector={isDefined(nvt) ? nvt.tags.cvss_base_vector : undefined}
          nvtFamily={isDefined(nvt) ? nvt.family : undefined}
          nvtName={isDefined(nvt) ? nvt.name : undefined}
          nvtLastModified={isDefined(nvt) ? nvt.modificationTime : undefined}
          nvtOid={isDefined(nvt) ? nvt.oid : undefined}
          nvtSeverity={isDefined(nvt) ? nvt.severity : undefined}
          nvtSummary={isDefined(nvt) ? nvt.tags.summary : undefined}
          preferences={isDefined(nvt) ? nvt.preferences : undefined}
          timeout={isDefined(nvt) ? nvt.timeout : undefined}
          title={editNvtDetailsDialogTitle}
          onClose={handleCloseEditNvtDetailsDialog}
          onSave={handleSavePolicyNvt}
        />
      )}
    </React.Fragment>
  );
};

PolicyComponent.propTypes = {
  alerts: PropTypes.arrayOf(PropTypes.model),
  children: PropTypes.func.isRequired,
  defaultAlertId: PropTypes.id,
  defaultScannerId: PropTypes.id,
  defaultScheduleId: PropTypes.id,
  defaultTargetId: PropTypes.id,
  gmp: PropTypes.gmp.isRequired,
  isLoadingScanners: PropTypes.bool,
  loadAlerts: PropTypes.func.isRequired,
  loadScanners: PropTypes.func.isRequired,
  loadSchedules: PropTypes.func.isRequired,
  loadTargets: PropTypes.func.isRequired,
  scanners: PropTypes.arrayOf(PropTypes.model),
  schedules: PropTypes.arrayOf(PropTypes.model),
  targets: PropTypes.arrayOf(PropTypes.model),
  onCloneError: PropTypes.func,
  onCloned: PropTypes.func,
  onCreateError: PropTypes.func,
  onCreated: PropTypes.func,
  onDeleteError: PropTypes.func,
  onDeleted: PropTypes.func,
  onDownloadError: PropTypes.func,
  onDownloaded: PropTypes.func,
  onImportError: PropTypes.func,
  onImported: PropTypes.func,
  onInteraction: PropTypes.func.isRequired,
  onSaveError: PropTypes.func,
  onSaved: PropTypes.func,
};

const mapStateToProps = rootState => {
  const alertSel = alertSelector(rootState);
  const userDefaults = getUserSettingsDefaults(rootState);
  const scannersSel = scannerSelector(rootState);
  const scheduleSel = scheduleSelector(rootState);
  const targetSel = targetSelector(rootState);

  const scannerList = scannersSel.getEntities(ALL_FILTER);
  const scanners = isDefined(scannerList)
    ? scannerList.filter(
        scanner =>
          scanner.scannerType === OPENVAS_SCANNER_TYPE ||
          scanner.scannerType === GREENBONE_SENSOR_SCANNER_TYPE,
      )
    : undefined;

  return {
    timezone: getTimezone(rootState),
    alerts: alertSel.getEntities(ALL_FILTER),
    defaultAlertId: userDefaults.getValueByName('defaultalert'),
    defaultEsxiCredential: userDefaults.getValueByName('defaultesxicredential'),
    defaultPortListId: userDefaults.getValueByName('defaultportlist'),
    defaultScannerId: userDefaults.getValueByName('defaultopenvasscanner'),
    defaultScheduleId: userDefaults.getValueByName('defaultschedule'),
    defaultSshCredential: userDefaults.getValueByName('defaultsshcredential'),
    defaultSmbCredential: userDefaults.getValueByName('defaultsmbcredential'),
    defaultTargetId: userDefaults.getValueByName('defaulttarget'),
    isLoadingScanners: scannersSel.isLoadingAllEntities(ALL_FILTER),
    scanners,
    schedules: scheduleSel.getEntities(ALL_FILTER),
    targets: targetSel.getEntities(ALL_FILTER),
  };
};

export default compose(
  withCapabilities,
  connect(mapStateToProps, undefined),
)(PolicyComponent);
