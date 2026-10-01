//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:copy_with_extension/copy_with_extension.dart';
import 'package:json_annotation/json_annotation.dart';

part 'send_chat_message_dto.g.dart';

@CopyWith()
@JsonSerializable(
  checked: true,
  createToJson: true,
  disallowUnrecognizedKeys: false,
  explicitToJson: true,
)
class SendChatMessageDto {
  /// Returns a new [SendChatMessageDto] instance.
  SendChatMessageDto({this.phrase, this.text});

  @JsonKey(
    name: r'phrase',
    required: false,
    includeIfNull: false,
    unknownEnumValue: SendChatMessageDtoPhraseEnum.unknownDefaultOpenApi,
  )
  final SendChatMessageDtoPhraseEnum? phrase;

  @JsonKey(name: r'text', required: false, includeIfNull: false)
  final String? text;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is SendChatMessageDto &&
          other.phrase == phrase &&
          other.text == text;

  @override
  int get hashCode => phrase.hashCode + text.hashCode;

  factory SendChatMessageDto.fromJson(Map<String, dynamic> json) =>
      _$SendChatMessageDtoFromJson(json);

  Map<String, dynamic> toJson() => _$SendChatMessageDtoToJson(this);

  @override
  String toString() {
    return toJson().toString();
  }
}

enum SendChatMessageDtoPhraseEnum {
  @JsonValue(r'hello')
  hello(r'hello'),
  @JsonValue(r'thanks')
  thanks(r'thanks'),
  @JsonValue(r'great-job')
  greatJob(r'great-job'),
  @JsonValue(r'lets-go')
  letsGo(r'lets-go'),
  @JsonValue(r'i-need-help')
  iNeedHelp(r'i-need-help'),
  @JsonValue(r'can-you-check')
  canYouCheck(r'can-you-check'),
  @JsonValue(r'i-have-an-idea')
  iHaveAnIdea(r'i-have-an-idea'),
  @JsonValue(r'my-part-is-done')
  myPartIsDone(r'my-part-is-done'),
  @JsonValue(r'good-idea')
  goodIdea(r'good-idea'),
  @JsonValue(r'give-me-a-minute')
  giveMeAMinute(r'give-me-a-minute'),
  @JsonValue(r'yes')
  yes(r'yes'),
  @JsonValue(r'no')
  no(r'no'),
  @JsonValue(r'see-you')
  seeYou(r'see-you'),
  @JsonValue(r'unknown_default_open_api')
  unknownDefaultOpenApi(r'unknown_default_open_api');

  const SendChatMessageDtoPhraseEnum(this.value);

  final String value;

  @override
  String toString() => value;
}
