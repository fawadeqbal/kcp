//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:copy_with_extension/copy_with_extension.dart';
import 'package:json_annotation/json_annotation.dart';

part 'update_email_preferences_dto.g.dart';

@CopyWith()
@JsonSerializable(
  checked: true,
  createToJson: true,
  disallowUnrecognizedKeys: false,
  explicitToJson: true,
)
class UpdateEmailPreferencesDto {
  /// Returns a new [UpdateEmailPreferencesDto] instance.
  UpdateEmailPreferencesDto({this.monthlySummary, this.weeklyReport});

  @JsonKey(name: r'monthlySummary', required: false, includeIfNull: false)
  final bool? monthlySummary;

  @JsonKey(name: r'weeklyReport', required: false, includeIfNull: false)
  final bool? weeklyReport;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is UpdateEmailPreferencesDto &&
          other.monthlySummary == monthlySummary &&
          other.weeklyReport == weeklyReport;

  @override
  int get hashCode => monthlySummary.hashCode + weeklyReport.hashCode;

  factory UpdateEmailPreferencesDto.fromJson(Map<String, dynamic> json) =>
      _$UpdateEmailPreferencesDtoFromJson(json);

  Map<String, dynamic> toJson() => _$UpdateEmailPreferencesDtoToJson(this);

  @override
  String toString() {
    return toJson().toString();
  }
}
