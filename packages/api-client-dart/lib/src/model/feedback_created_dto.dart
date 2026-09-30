//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:copy_with_extension/copy_with_extension.dart';
import 'package:json_annotation/json_annotation.dart';

part 'feedback_created_dto.g.dart';

@CopyWith()
@JsonSerializable(
  checked: true,
  createToJson: true,
  disallowUnrecognizedKeys: false,
  explicitToJson: true,
)
class FeedbackCreatedDto {
  /// Returns a new [FeedbackCreatedDto] instance.
  FeedbackCreatedDto({required this.id});

  @JsonKey(name: r'id', required: true, includeIfNull: false)
  final String id;

  @override
  bool operator ==(Object other) =>
      identical(this, other) || other is FeedbackCreatedDto && other.id == id;

  @override
  int get hashCode => id.hashCode;

  factory FeedbackCreatedDto.fromJson(Map<String, dynamic> json) =>
      _$FeedbackCreatedDtoFromJson(json);

  Map<String, dynamic> toJson() => _$FeedbackCreatedDtoToJson(this);

  @override
  String toString() {
    return toJson().toString();
  }
}
