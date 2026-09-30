//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:copy_with_extension/copy_with_extension.dart';
import 'package:json_annotation/json_annotation.dart';

part 'create_feedback_dto.g.dart';

@CopyWith()
@JsonSerializable(
  checked: true,
  createToJson: true,
  disallowUnrecognizedKeys: false,
  explicitToJson: true,
)
class CreateFeedbackDto {
  /// Returns a new [CreateFeedbackDto] instance.
  CreateFeedbackDto({
    required this.kind,

    required this.message,

    this.pagePath,

    this.languageCode,
  });

  @JsonKey(
    name: r'kind',
    required: true,
    includeIfNull: false,
    unknownEnumValue: CreateFeedbackDtoKindEnum.unknownDefaultOpenApi,
  )
  final CreateFeedbackDtoKindEnum kind;

  @JsonKey(name: r'message', required: true, includeIfNull: false)
  final String message;

  /// The page it was sent from, e.g. \"/ar/learn/builder-m01-l03\" (query and fragment are dropped).
  @JsonKey(name: r'pagePath', required: false, includeIfNull: false)
  final String? pagePath;

  /// The interface language when it was sent.
  @JsonKey(name: r'languageCode', required: false, includeIfNull: false)
  final String? languageCode;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is CreateFeedbackDto &&
          other.kind == kind &&
          other.message == message &&
          other.pagePath == pagePath &&
          other.languageCode == languageCode;

  @override
  int get hashCode =>
      kind.hashCode +
      message.hashCode +
      pagePath.hashCode +
      languageCode.hashCode;

  factory CreateFeedbackDto.fromJson(Map<String, dynamic> json) =>
      _$CreateFeedbackDtoFromJson(json);

  Map<String, dynamic> toJson() => _$CreateFeedbackDtoToJson(this);

  @override
  String toString() {
    return toJson().toString();
  }
}

enum CreateFeedbackDtoKindEnum {
  @JsonValue(r'SAFETY')
  SAFETY(r'SAFETY'),
  @JsonValue(r'BUG')
  BUG(r'BUG'),
  @JsonValue(r'IDEA')
  IDEA(r'IDEA'),
  @JsonValue(r'PRAISE')
  PRAISE(r'PRAISE'),
  @JsonValue(r'OTHER')
  OTHER(r'OTHER'),
  @JsonValue(r'unknown_default_open_api')
  unknownDefaultOpenApi(r'unknown_default_open_api');

  const CreateFeedbackDtoKindEnum(this.value);

  final String value;

  @override
  String toString() => value;
}
