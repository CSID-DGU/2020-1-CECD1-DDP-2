package com.fasoo.wrapsody.commandserver.service;

import org.springframework.amqp.core.Message;
import org.springframework.amqp.core.MessageListener;
import org.springframework.stereotype.Service;

@Service
public class RabbitMQListener implements MessageListener {
    public void onMessage(Message message) {
        System.out.println("Consuming Message - ");
        System.out.println(new String(message.getBody()));
    }
}