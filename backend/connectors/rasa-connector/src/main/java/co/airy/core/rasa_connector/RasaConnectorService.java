package co.airy.core.rasa_connector;

import co.airy.avro.communication.Message;
import co.airy.core.rasa_connector.models.MessageSend;
import co.airy.core.rasa_connector.models.MessageSendResponse;
import co.airy.log.AiryLoggerFactory;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import feign.Feign;
import feign.jackson.JacksonDecoder;
import feign.jackson.JacksonEncoder;
import feign.okhttp.OkHttpClient;
import org.slf4j.Logger;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class RasaConnectorService {
    //private final apiToken;
    private String rasaRestUrl;
    private final RasaClient rasaClient;
    private static final ObjectMapper mapper = new ObjectMapper();

    private static final Logger log = AiryLoggerFactory.getLogger(RasaConnectorService.class);
    private final MessageHandler messageHandler;
    RasaConnectorService(MessageHandler messageHandler,
                         @Value("${rasa.rest-webhook-url}") String rasaRestUrl){
        this.rasaClient = bootstrapRasaClient(rasaRestUrl);
        this.messageHandler = messageHandler;
        this.rasaRestUrl = rasaRestUrl;
    }

    @Async("threadPoolTaskExecutor")
    public void send(Message message) {
        try {
            List<MessageSendResponse> messageResp = this.rasaClient.sendMessage(MessageSend.builder()
                    .message(getTextFromContent(message.getContent()))
                    .sender(message.getId())
                    .build());
            // Unpack multiple response(s)
            for (MessageSendResponse msg: messageResp) {
                try {
                    messageHandler.writeReplyToKafka(message, msg);
                }
                catch (Exception e){
                    log.error(String.format("could not handle response for non-text data type for message id %s %s", msg.toString(), e.toString()));
                }
            }
        }
        catch (Exception e){
            log.error(String.format("unexpected exception for message id %s %s", message.getId(), e.toString()));
        }
    }
    // Add API token later
    private RasaClient bootstrapRasaClient(String rasaRestUrl) {
        return Feign.builder()
                .client(new OkHttpClient())
                .encoder(new JacksonEncoder())
                .decoder(new JacksonDecoder())
                .logger(new feign.Logger.ErrorLogger())
                .logLevel(feign.Logger.Level.FULL)
                .target(RasaClient.class, rasaRestUrl);
    }

    private String getTextFromContent(String content) {
        String text = "";

        try {
            final JsonNode node = Optional.ofNullable(mapper.readTree(content)).orElseGet(mapper::createObjectNode);

            //NOTE: Tries to find the text context for text messages
            text = Optional.ofNullable(node.findValue("text")).orElseGet(mapper::createObjectNode).asText();
        } catch (JsonProcessingException e) {
            log.error(String.format("unable to parse text from content %s", content));
        }

        //NOTE: return default message when text is not found
        return Optional.ofNullable(text).filter(s -> !s.isEmpty()).orElse("New message");
    }
}