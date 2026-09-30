//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:copy_with_extension/copy_with_extension.dart';
import 'package:json_annotation/json_annotation.dart';

part 'email_preferences_dto.g.dart';

@CopyWith()
@JsonSerializable(
  checked: true,
  createToJson: true,
  disallowUnrecognizedKeys: false,
  explicitToJson: true,
)
class EmailPreferencesDto {
  /// Returns a new [EmailPreferencesDto] instance.
  EmailPreferencesDto({required this.monthlySummary});

  /// The monthly email about the children's progress.
  @JsonKey(name: r'monthlySummary', required: true, includeIfNull: false)
  final bool monthlySummary;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is EmailPreferencesDto && other.monthlySummary == monthlySummary;

  @override
  int get hashCode => monthlySummary.hashCode;

  factory EmailPreferencesDto.fromJson(Map<String, dynamic> json) =>
      _$EmailPreferencesDtoFromJson(json);

  Map<String, dynamic> toJson() => _$EmailPreferencesDtoToJson(this);

  @override
  String toString() {
    return toJson().toString();
  }
}
