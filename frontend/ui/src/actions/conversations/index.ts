import {Dispatch} from 'redux';
import {createAction} from 'typesafe-actions';
import {Conversation, PaginatedResponse} from 'httpclient';
import {HttpClientInstance} from '../../InitializeAiryApi';
import {StateModel} from '../../reducers';
import {mergeMetadataAction, setMetadataAction} from '../metadata';

const CONVERSATION_LOADING = '@@conversation/LOADING';
const CONVERSATIONS_LOADING = '@@conversations/LOADING';
const CONVERSATIONS_MERGE = '@@conversations/MERGE';
const CONVERSATION_ADD_ERROR = '@@conversations/ADD_ERROR_TO_CONVERSATION';
const CONVERSATION_REMOVE_ERROR = '@@conversations/REMOVE_ERROR_FROM_CONVERSATION';
const CONVERSATION_ADD_TAG = '@@conversations/CONVERSATION_ADD_TAG';
const CONVERSATION_REMOVE_TAG = '@@conversations/CONVERSATION_REMOVE_TAG';
const CONVERSATION_UPDATE_PAGINATION_DATA = '@@conversation/UPDATE_PAGINATION_DATA';

export const loadingConversationAction = createAction(CONVERSATION_LOADING, resolve => (conversationId: string) =>
  resolve(conversationId)
);

export const loadingConversationsAction = createAction(CONVERSATIONS_LOADING, resolve => () => resolve());

export const mergeConversationsAction = createAction(
  CONVERSATIONS_MERGE,
  resolve => (
    conversations: Conversation[],
    paginationData?: {previousCursor: string; nextCursor: string; total: number}
  ) => resolve({conversations, paginationData})
);

export const addErrorToConversationAction = createAction(
  CONVERSATION_ADD_ERROR,
  resolve => (conversationId: string, errorMessage: string) => resolve({conversationId, errorMessage})
);

export const removeErrorFromConversationAction = createAction(
  CONVERSATION_REMOVE_ERROR,
  resolve => (conversationId: string) => resolve({conversationId})
);

export const removeTagFromConversationAction = createAction(
  CONVERSATION_REMOVE_TAG,
  resolve => (conversationId: string, tagId: string) => resolve({conversationId, tagId})
);

export const updateMessagesPaginationDataAction = createAction(
  CONVERSATION_UPDATE_PAGINATION_DATA,
  resolve => (conversationId: string, paginationData: {previousCursor: string; nextCursor: string; total: number}) =>
    resolve({conversationId, paginationData})
);

export const listConversations = () => async (dispatch: Dispatch<any>) => {
  dispatch(loadingConversationsAction());
  return HttpClientInstance.listConversations({page_size: 10}).then((response: PaginatedResponse<Conversation>) => {
    dispatch(mergeConversationsAction(response.data, response.paginationData));
    return Promise.resolve(true);
  });
};

export const listNextConversations = () => async (dispatch: Dispatch<any>, state: () => StateModel) => {
  const cursor = state().data.conversations.all.paginationData.nextCursor;

  dispatch(loadingConversationsAction());
  return HttpClientInstance.listConversations({cursor: cursor}).then((response: PaginatedResponse<Conversation>) => {
    dispatch(mergeConversationsAction(response.data, response.paginationData));
    return Promise.resolve(true);
  });
};

function sleep(time) {
  return new Promise(resolve => setTimeout(resolve, time));
}

export const getConversationInfo = (conversationId: string, retries?: number) => async (dispatch: Dispatch<any>) =>
  HttpClientInstance.getConversationInfo(conversationId)
    .then(response => {
      dispatch(mergeConversationsAction([response]));
      return Promise.resolve(true);
    })
    .catch(async (error: Error) => {
      if (retries > 5) {
        return Promise.reject(error);
      } else {
        await sleep(1000);
        return getConversationInfo(conversationId, retries ? retries + 1 : 1)(dispatch);
      }
    });

export const readConversations = (conversationId: string) => (dispatch: Dispatch<any>) => {
  HttpClientInstance.readConversations(conversationId).then(() =>
    dispatch(
      setMetadataAction({
        subject: 'conversation',
        identifier: conversationId,
        metadata: {
          unreadCount: 0,
        },
      })
    )
  );
};

export const addTagToConversation = (conversationId: string, tagId: string) => (dispatch: Dispatch<any>) => {
  HttpClientInstance.tagConversation({conversationId, tagId}).then(() =>
    dispatch(
      mergeMetadataAction({
        subject: 'conversation',
        identifier: conversationId,
        metadata: {
          tags: {
            [tagId]: '',
          },
        },
      })
    )
  );
};

export const removeTagFromConversation = (conversationId: string, tagId: string) => (dispatch: Dispatch<any>) => {
  HttpClientInstance.untagConversation({conversationId, tagId}).then(() =>
    dispatch(removeTagFromConversationAction(conversationId, tagId))
  );
};
