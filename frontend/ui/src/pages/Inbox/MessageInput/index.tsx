import React, {useState, useEffect, useRef, KeyboardEvent, useCallback} from 'react';
import {connect, ConnectedProps} from 'react-redux';
import styles from './index.module.scss';
import {sendMessages} from '../../../actions/messages';
import TemplateSelector from '../TemplateSelector';
import 'emoji-mart/css/emoji-mart.css';
import {withRouter} from 'react-router-dom';
import {Button} from 'components';
import {cyMessageSendButton, cyMessageTextArea} from 'handles';
import {Picker} from 'emoji-mart';
import {SourceMessage} from 'render';
import {Message, SuggestedReply, Suggestions, Template, Source} from 'model';
import {getTextMessagePayload} from 'httpclient';
import 'emoji-mart/css/emoji-mart.css';

import {ReactComponent as Paperplane} from 'assets/images/icons/paperplane.svg';
import {ReactComponent as Smiley} from 'assets/images/icons/smiley.svg';
import {ReactComponent as TemplateAlt} from 'assets/images/icons/template-alt.svg';
import {ReactComponent as Close} from 'assets/images/icons/close.svg';
import {ReactComponent as ChevronDownIcon} from 'assets/images/icons/chevron-down.svg';

import {ConversationRouteProps} from '../index';
import {StateModel} from '../../../reducers';
import {listTemplates} from '../../../actions/templates';
import {getConversation} from '../../../selectors/conversations';
import {getCurrentMessages} from '../../../selectors/conversations';
import {isTextMessage} from '../../../services/types/messageTypes';

import SuggestedReplySelector from '../SuggestedReplySelector';
import {isEmpty} from 'lodash-es';

const mapDispatchToProps = {sendMessages};

const mapStateToProps = (state: StateModel, ownProps: ConversationRouteProps) => {
  return {
    conversation: getConversation(state, ownProps),
    messages: getCurrentMessages(state, ownProps),
    listTemplates,
  };
};

const connector = connect(mapStateToProps, mapDispatchToProps);
type MessageInputProps = {
  source: Source;
  suggestions: Suggestions;
  showSuggestedReplies: (suggestions: Suggestions) => void;
  hideSuggestedReplies: () => void;
};

interface SelectedTemplate {
  message: Template;
  source: Source;
}

interface SelectedSuggestedReply {
  message: SuggestedReply;
}

const MessageInput = (props: MessageInputProps & ConnectedProps<typeof connector>) => {
  const {source, conversation, suggestions, showSuggestedReplies, hideSuggestedReplies, sendMessages} = props;

  const [input, setInput] = useState('');
  const [isShowingEmojiDrawer, setIsShowingEmojiDrawer] = useState(false);
  const [isShowingTemplateModal, setIsShowingTemplateModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<SelectedTemplate | null>(null);
  const [disconnectedChannelToolTip, setDisconnectedChannelToolTip] = useState(false);
  const [selectedSuggestedReply, setSelectedSuggestedReply] = useState<SelectedSuggestedReply | null>(null);

  const textAreaRef = useRef(null);
  const sendButtonRef = useRef(null);
  const emojiDiv = useRef<HTMLDivElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>): void => {
    setInput(e.target.value);
  };

  useEffect(() => {
    textAreaRef.current.style.height = '0px';
    let scrollHeight = Math.min(300, textAreaRef.current.scrollHeight);
    if (scrollHeight < 40) scrollHeight = 40;
    textAreaRef.current.style.height = scrollHeight + 'px';
  }, [input]);

  useEffect(() => {
    if (!conversation.channel.connected) {
      setInput('');
      textAreaRef.current.style.cursor = 'not-allowed';
    } else {
      textAreaRef.current.style.cursor = 'auto';
    }

    setDisconnectedChannelToolTip(!conversation.channel.connected);
  }, [conversation.channel.connected]);

  const sendMessage = () => {
    if (!conversation.channel.connected) {
      return;
    }
    setSelectedSuggestedReply(null);
    setSelectedTemplate(null);
    sendMessages(
      selectedTemplate || selectedSuggestedReply
        ? {
            conversationId: conversation.id,
            message: selectedTemplate?.message.content || selectedSuggestedReply?.message.content,
          }
        : getTextMessagePayload(source, conversation.id, input)
    ).then(() => setInput(''));
  };

  const handleClick = () => {
    sendMessage();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.metaKey && event.key === 'Enter') {
      sendMessage();
    }
  };

  const InputOptions = () => {
    const handleEmojiDrawer = () => {
      if (isShowingTemplateModal) {
        setIsShowingTemplateModal(false);
      }
      if (isShowingEmojiDrawer) {
        textAreaRef.current && textAreaRef.current.focus();
      }

      setIsShowingEmojiDrawer(!isShowingEmojiDrawer);
    };

    const handleEmojiKeyEvent = e => {
      if (e.key === 'Escape') {
        handleEmojiDrawer();
      }
    };

    const handleEmojiClickedOutside = e => {
      if (emojiDiv.current === null || emojiDiv.current.contains(e.target)) {
        return;
      }

      handleEmojiDrawer();
    };

    useEffect(() => {
      if (isShowingEmojiDrawer) {
        document.addEventListener('keydown', handleEmojiKeyEvent);
        document.addEventListener('click', handleEmojiClickedOutside);

        return () => {
          document.removeEventListener('keydown', handleEmojiKeyEvent);
          document.removeEventListener('click', handleEmojiClickedOutside);
        };
      }
    }, [isShowingEmojiDrawer]);

    const toggleTemplateModal = () => {
      if (isShowingEmojiDrawer) {
        setIsShowingEmojiDrawer(false);
      }
      setIsShowingTemplateModal(!isShowingTemplateModal);
    };

    const selectTemplate = (template: Template) => {
      const jsonTemplate = template.content;

      if (isTextMessage(template)) {
        setInput(jsonTemplate.text);
      } else {
        setSelectedTemplate({message: template, source: template.source});
      }

      setIsShowingTemplateModal(false);
      sendButtonRef.current.focus();
    };

    const addEmoji = emoji => {
      const emojiMessage = emoji.native;

      const message = input + ' ' + emojiMessage;

      setInput(message);

      handleEmojiDrawer();
    };

    return (
      <div className={styles.messageActionsContainer}>
        <>
          {isShowingTemplateModal && (
            <TemplateSelector onClose={toggleTemplateModal} selectTemplate={selectTemplate} source={source} />
          )}
          {isShowingEmojiDrawer && (
            <div ref={emojiDiv} className={styles.emojiDrawer}>
              <Picker showPreview={false} onSelect={addEmoji} title="Emoji" />
            </div>
          )}
          <button
            className={`${styles.iconButton} ${styles.templateButton} ${isShowingEmojiDrawer ? styles.active : ''} ${
              disconnectedChannelToolTip ? styles.disabledIconButton : styles.activeIconButton
            }`}
            type="button"
            disabled={disconnectedChannelToolTip ? true : false}
            onClick={() => handleEmojiDrawer()}>
            <div className={styles.actionToolTip}>Emojis</div>
            <Smiley aria-hidden />
          </button>
          <button
            className={`${styles.iconButton} ${styles.templateButton} ${isShowingTemplateModal ? styles.active : ''} ${
              disconnectedChannelToolTip ? styles.disabledIconButton : styles.activeIconButton
            }`}
            type="button"
            disabled={disconnectedChannelToolTip ? true : false}
            onClick={() => toggleTemplateModal()}>
            <div className={styles.actionToolTip}>Templates</div>
            <TemplateAlt aria-hidden />
          </button>
        </>
      </div>
    );
  };

  const getLastMessageWithSuggestedReplies = useCallback(() => {
    const lastMessages = props.messages
      ?.filter((message: Message) => message.fromContact)
      .slice(props.messages.length - 5)
      .reverse();
    return lastMessages?.find(
      (message: Message) => message.metadata?.suggestions && Object.keys(message.metadata.suggestions).length > 0
    );
  }, [props.messages]);

  const hasSuggestions = () => !isEmpty(suggestions);

  const toggleSuggestedReplies = () => {
    if (hasSuggestions()) {
      hideSuggestedReplies();
    } else {
      showSuggestedReplies(getLastMessageWithSuggestedReplies().metadata.suggestions);
    }
  };

  const selectSuggestedReply = (reply: SuggestedReply) => {
    hideSuggestedReplies();
    if (isTextMessage(reply)) {
      setInput(reply.content.text);
    } else {
      setSelectedSuggestedReply({message: reply});
    }
    sendButtonRef.current.focus();
  };

  return (
    <div className={styles.container}>
      {getLastMessageWithSuggestedReplies() && (
        <div className={styles.suggestionsRow}>
          {hasSuggestions() && (
            <SuggestedReplySelector
              onClose={toggleSuggestedReplies}
              suggestions={suggestions}
              selectSuggestedReply={selectSuggestedReply}
              source={source}
            />
          )}

          <Button type="button" styleVariant="outline-big" onClick={toggleSuggestedReplies}>
            <div className={styles.suggestionButton}>
              Suggestions
              <ChevronDownIcon className={hasSuggestions() ? styles.chevronUp : styles.chevronDown} />
            </div>
          </Button>
        </div>
      )}
      <form className={styles.inputForm}>
        <div className={styles.messageWrap}>
          <div className={styles.inputWrap}>
            {!selectedTemplate && !selectedSuggestedReply && (
              <>
                <textarea
                  className={styles.messageTextArea}
                  ref={textAreaRef}
                  rows={1}
                  name="inputBar"
                  placeholder={disconnectedChannelToolTip ? '' : 'Enter a message...'}
                  autoFocus={disconnectedChannelToolTip ? false : true}
                  value={input}
                  onChange={handleChange}
                  onKeyDown={handleKeyDown}
                  data-cy={cyMessageTextArea}
                  disabled={disconnectedChannelToolTip ? true : false}
                />
                <InputOptions />
              </>
            )}
            {selectedSuggestedReply && (
              <div className={styles.suggestionRepliesSelector}>
                <button className={styles.removeButton} onClick={() => setSelectedSuggestedReply(null)}>
                  <Close />
                </button>
                <SourceMessage
                  content={selectedSuggestedReply.message}
                  source={source}
                  contentType="suggestedReplies"
                />
              </div>
            )}

            {selectedTemplate && (
              <div className={styles.templateSelector}>
                <button className={styles.removeButton} onClick={() => setSelectedTemplate(null)}>
                  <Close />
                </button>
                <SourceMessage
                  content={selectedTemplate.message}
                  source={selectedTemplate.source}
                  contentType="template"
                />
              </div>
            )}
          </div>
        </div>

        <div className={styles.sendDiv}>
          {disconnectedChannelToolTip && (
            <div className={styles.disconnectedChannelToolTip}>
              <p>Sending messages is disabled because this channel was disconnected.</p>
            </div>
          )}
          <button
            type="button"
            ref={sendButtonRef}
            className={`${styles.sendButton} ${
              (input || selectedTemplate || selectedSuggestedReply) &&
              !disconnectedChannelToolTip &&
              styles.sendButtonActive
            }`}
            onClick={handleClick}
            disabled={
              (input.trim().length == 0 && !selectedTemplate && !selectedSuggestedReply) || disconnectedChannelToolTip
            }
            data-cy={cyMessageSendButton}>
            <div className={styles.sendButtonText}>
              <Paperplane />
            </div>
          </button>
        </div>
      </form>
    </div>
  );
};

export default withRouter(connector(MessageInput));
