// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'chat_response.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

ChatResponse _$ChatResponseFromJson(Map<String, dynamic> json) => ChatResponse(
  response: json['answer'] as String,
  intent: json['intent'] as String?,
  meetingDetails: json['meeting_details'] as Map<String, dynamic>?,
);

Map<String, dynamic> _$ChatResponseToJson(ChatResponse instance) =>
    <String, dynamic>{
      'answer': instance.response,
      'intent': instance.intent,
      'meeting_details': instance.meetingDetails,
    };
