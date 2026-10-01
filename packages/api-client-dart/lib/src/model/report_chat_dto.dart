//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:copy_with_extension/copy_with_extension.dart';
import 'package:json_annotation/json_annotation.dart';

part 'report_chat_dto.g.dart';

@CopyWith()
@JsonSerializable(
  checked: true,
  createToJson: true,
  disallowUnrecognizedKeys: false,
  explicitToJson: true,
)
class ReportChatDto {
  /// Returns a new [ReportChatDto] instance.
  ReportChatDto({this.messageId, this.userId, required this.reason});

  /// The message (or, without one, the member) being reported.
  @JsonKey(name: r'messageId', required: false, includeIfNull: false)
  final String? messageId;

  @JsonKey(name: r'userId', required: false, includeIfNull: false)
  final String? userId;

  @JsonKey(
    name: r'reason',
    required: true,
    includeIfNull: false,
    unknownEnumValue: ReportChatDtoReasonEnum.unknownDefaultOpenApi,
  )
  final ReportChatDtoReasonEnum reason;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is ReportChatDto &&
          other.messageId == messageId &&
          other.userId == userId &&
          other.reason == reason;

  @override
  int get hashCode => messageId.hashCode + userId.hashCode + reason.hashCode;

  factory ReportChatDto.fromJson(Map<String, dynamic> json) =>
      _$ReportChatDtoFromJson(json);

  Map<String, dynamic> toJson() => _$ReportChatDtoToJson(this);

  @override
  String toString() {
    return toJson().toString();
  }
}

enum ReportChatDtoReasonEnum {
  @JsonValue(r'UNKIND')
  UNKIND(r'UNKIND'),
  @JsonValue(r'PERSONAL_INFO')
  PERSONAL_INFO(r'PERSONAL_INFO'),
  @JsonValue(r'SPAM')
  SPAM(r'SPAM'),
  @JsonValue(r'SCARY')
  SCARY(r'SCARY'),
  @JsonValue(r'OTHER')
  OTHER(r'OTHER'),
  @JsonValue(r'unknown_default_open_api')
  unknownDefaultOpenApi(r'unknown_default_open_api');

  const ReportChatDtoReasonEnum(this.value);

  final String value;

  @override
  String toString() => value;
}
