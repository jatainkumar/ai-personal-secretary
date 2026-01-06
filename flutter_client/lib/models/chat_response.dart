import 'package:json_annotation/json_annotation.dart';

part 'chat_response.g.dart';

@JsonSerializable()
class ChatResponse {
  @JsonKey(name: 'answer')
  final String response;

  final String? intent;

  @JsonKey(name: 'meeting_details')
  final Map<String, dynamic>? meetingDetails;

  ChatResponse({required this.response, this.intent, this.meetingDetails});

  factory ChatResponse.fromJson(Map<String, dynamic> json) =>
      _$ChatResponseFromJson(json);

  Map<String, dynamic> toJson() => _$ChatResponseToJson(this);
}
