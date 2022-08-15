import React, {useEffect, useState} from 'react';
import {connect, ConnectedProps, useSelector} from 'react-redux';
import {useNavigate} from 'react-router-dom';
import {Channel, Source, getSourceForComponent} from 'model';
import InfoCard, {InfoCardStyle} from '../../components/InfoCard';
import {StateModel} from '../../reducers';
import {allChannelsConnected} from '../../selectors/channels';
import {listChannels} from '../../actions/channel';
import {listComponents} from '../../actions/catalog';
import {setPageTitle} from '../../services/pageTitle';
import {getConnectorsConfiguration} from '../../actions';
import {EmptyStateConnectors} from './EmptyStateConnectors';
import {ChannelCard} from './ChannelCard';
import {SimpleLoader} from 'components';
import {getComponentStatus} from '../../services/getComponentStatus';
import styles from './index.module.scss';

export enum ComponentStatus {
  enabled = 'Enabled',
  notConfigured = 'Not Configured',
  disabled = 'Disabled',
}

const mapDispatchToProps = {
  listChannels,
  getConnectorsConfiguration,
  listComponents,
};

const connector = connect(null, mapDispatchToProps);

const Connectors = (props: ConnectedProps<typeof connector>) => {
  const {listChannels, getConnectorsConfiguration, listComponents} = props;
  const [connectorsPageList, setConnectorsPageList] = useState([]);
  const channels = useSelector((state: StateModel) => Object.values(allChannelsConnected(state)));
  const components = useSelector((state: StateModel) => state.data.config.components);
  const connectors = useSelector((state: StateModel) => state.data.connector);
  const catalogList = useSelector((state: StateModel) => state.data.catalog);
  const channelsBySource = (Source: Source) => channels.filter((channel: Channel) => channel.source === Source);
  const [hasInstalledComponents, setHasInstalledComponents] = useState(false);
  const navigate = useNavigate();
  const pageTitle = 'Connectors';
  const isInstalled = true;

  const catalogListArr = Object.entries(catalogList);
  const emptyCatalogList = catalogListArr.length === 0;

  console.log('connectors', connectors);
  console.log('components', components);
  console.log('catalogList', catalogList);

  //map through this array + get image with getChannelAvatar
  //fix props and names of mapping
  //to do: upload to s3 svgs of all sources and add the links to dynamodb

  useEffect(() => {
    getConnectorsConfiguration();
    if (emptyCatalogList) {
      listComponents();
    } else {
      catalogListArr.map(component => {
        if (component[1].installed === true) {
          setHasInstalledComponents(true);
          setConnectorsPageList(prevState => [
            ...prevState,
            {
              name: component[1].name,
              displayName: component[1].displayName,
              configKey: formatComponentNameToConfigKey(component[1].name),
            },
          ]);
        }
      });
    }
  }, [catalogList]);

  useEffect(() => {
    if (channels.length === 0) {
      listChannels();
    }
    setPageTitle(pageTitle);
  }, [channels.length]);

  const isComponentInstalled = (componentNameCatalog: string) => {
    return catalogList[componentNameCatalog] && catalogList[componentNameCatalog].installed === true;
  };

  const formatComponentNameToConfigKey = (componentName: string) => componentName.split('/')[1];

  return (
    <div className={styles.channelsWrapper}>
      <div className={styles.channelsHeadline}>
        <div>
          <h1 className={styles.channelsHeadlineText}>Connectors</h1>
          {emptyCatalogList && <SimpleLoader />}
        </div>
      </div>
      <div className={styles.wrapper}>
        {!hasInstalledComponents && catalogListArr.length > 0 ? (
          <EmptyStateConnectors />
        ) : (
          <>
            {connectorsPageList.map((item: {name: string; displayName: string; configKey: string}) => {
              return (
                (channelsBySource(getSourceForComponent(item.name)).length > 0 &&
                  components &&
                  components[item.configKey] &&
                  isComponentInstalled(item.name) && (
                    <ChannelCard
                      componentInfo={item}
                      channelsToShow={channelsBySource(getSourceForComponent(item.name)).length}
                      componentStatus={getComponentStatus(
                        isInstalled,
                        Object.keys(connectors[item.configKey]).length > 0 ||
                          getSourceForComponent(item.name) === Source.chatPlugin,
                        components[item.configKey]?.enabled
                      )}
                      key={item.displayName}
                    />
                  )) ||
                (channelsBySource(infoItem.type).length > 0 &&
                  !infoItem.channel &&
                  isComponentInstalled(infoItem.repository, infoItem.componentName) && (
                    <div className={styles.cardContainer} key={infoItem.type}>
                      <InfoCard
                        installed
                        style={InfoCardStyle.expanded}
                        sourceInfo={infoItem}
                        addChannelAction={() => {
                          navigate(infoItem.channelsListRoute);
                        }}
                      />
                    </div>
                  )) ||
                (getSourceForComponent(infoItem.type) &&
                  components &&
                  !infoItem.channel &&
                  isComponentInstalled(infoItem.repository, infoItem.componentName) && (
                    <div className={styles.cardContainer} key={infoItem.type}>
                      <InfoCard
                        installed={true}
                        componentStatus={getComponentStatus(
                          isInstalled,
                          Object.keys(connectors[infoItem.configKey]).length > 0,
                          components[infoItem?.configKey].enabled
                        )}
                        style={InfoCardStyle.normal}
                        key={infoItem.type}
                        sourceInfo={infoItem}
                        addChannelAction={() => {
                          navigate(infoItem.channelsListRoute);
                        }}
                      />
                    </div>
                  ))
              );
            })}
          </>
        )}
      </div>
    </div>
  );
};

export default connector(Connectors);