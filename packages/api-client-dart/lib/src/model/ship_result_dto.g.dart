// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'ship_result_dto.dart';

// **************************************************************************
// CopyWithGenerator
// **************************************************************************

abstract class _$ShipResultDtoCWProxy {
  ShipResultDto shipped(bool shipped);

  ShipResultDto results(List<CheckResultDto> results);

  ShipResultDto xpAwarded(num xpAwarded);

  ShipResultDto dailyCapReached(bool dailyCapReached);

  ShipResultDto badgesEarned(List<String> badgesEarned);

  ShipResultDto portfolioItemId(String? portfolioItemId);

  ShipResultDto version(num? version);

  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `ShipResultDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// ShipResultDto(...).copyWith(id: 12, name: "My name")
  /// ````
  ShipResultDto call({
    bool shipped,
    List<CheckResultDto> results,
    num xpAwarded,
    bool dailyCapReached,
    List<String> badgesEarned,
    String? portfolioItemId,
    num? version,
  });
}

/// Proxy class for `copyWith` functionality. This is a callable class and can be used as follows: `instanceOfShipResultDto.copyWith(...)`. Additionally contains functions for specific fields e.g. `instanceOfShipResultDto.copyWith.fieldName(...)`
class _$ShipResultDtoCWProxyImpl implements _$ShipResultDtoCWProxy {
  const _$ShipResultDtoCWProxyImpl(this._value);

  final ShipResultDto _value;

  @override
  ShipResultDto shipped(bool shipped) => this(shipped: shipped);

  @override
  ShipResultDto results(List<CheckResultDto> results) => this(results: results);

  @override
  ShipResultDto xpAwarded(num xpAwarded) => this(xpAwarded: xpAwarded);

  @override
  ShipResultDto dailyCapReached(bool dailyCapReached) =>
      this(dailyCapReached: dailyCapReached);

  @override
  ShipResultDto badgesEarned(List<String> badgesEarned) =>
      this(badgesEarned: badgesEarned);

  @override
  ShipResultDto portfolioItemId(String? portfolioItemId) =>
      this(portfolioItemId: portfolioItemId);

  @override
  ShipResultDto version(num? version) => this(version: version);

  @override
  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `ShipResultDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// ShipResultDto(...).copyWith(id: 12, name: "My name")
  /// ````
  ShipResultDto call({
    Object? shipped = const $CopyWithPlaceholder(),
    Object? results = const $CopyWithPlaceholder(),
    Object? xpAwarded = const $CopyWithPlaceholder(),
    Object? dailyCapReached = const $CopyWithPlaceholder(),
    Object? badgesEarned = const $CopyWithPlaceholder(),
    Object? portfolioItemId = const $CopyWithPlaceholder(),
    Object? version = const $CopyWithPlaceholder(),
  }) {
    return ShipResultDto(
      shipped: shipped == const $CopyWithPlaceholder()
          ? _value.shipped
          // ignore: cast_nullable_to_non_nullable
          : shipped as bool,
      results: results == const $CopyWithPlaceholder()
          ? _value.results
          // ignore: cast_nullable_to_non_nullable
          : results as List<CheckResultDto>,
      xpAwarded: xpAwarded == const $CopyWithPlaceholder()
          ? _value.xpAwarded
          // ignore: cast_nullable_to_non_nullable
          : xpAwarded as num,
      dailyCapReached: dailyCapReached == const $CopyWithPlaceholder()
          ? _value.dailyCapReached
          // ignore: cast_nullable_to_non_nullable
          : dailyCapReached as bool,
      badgesEarned: badgesEarned == const $CopyWithPlaceholder()
          ? _value.badgesEarned
          // ignore: cast_nullable_to_non_nullable
          : badgesEarned as List<String>,
      portfolioItemId: portfolioItemId == const $CopyWithPlaceholder()
          ? _value.portfolioItemId
          // ignore: cast_nullable_to_non_nullable
          : portfolioItemId as String?,
      version: version == const $CopyWithPlaceholder()
          ? _value.version
          // ignore: cast_nullable_to_non_nullable
          : version as num?,
    );
  }
}

extension $ShipResultDtoCopyWith on ShipResultDto {
  /// Returns a callable class that can be used as follows: `instanceOfShipResultDto.copyWith(...)` or like so:`instanceOfShipResultDto.copyWith.fieldName(...)`.
  // ignore: library_private_types_in_public_api
  _$ShipResultDtoCWProxy get copyWith => _$ShipResultDtoCWProxyImpl(this);
}

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

ShipResultDto _$ShipResultDtoFromJson(Map<String, dynamic> json) =>
    $checkedCreate('ShipResultDto', json, ($checkedConvert) {
      $checkKeys(
        json,
        requiredKeys: const [
          'shipped',
          'results',
          'xpAwarded',
          'dailyCapReached',
          'badgesEarned',
          'portfolioItemId',
          'version',
        ],
      );
      final val = ShipResultDto(
        shipped: $checkedConvert('shipped', (v) => v as bool),
        results: $checkedConvert(
          'results',
          (v) => (v as List<dynamic>)
              .map((e) => CheckResultDto.fromJson(e as Map<String, dynamic>))
              .toList(),
        ),
        xpAwarded: $checkedConvert('xpAwarded', (v) => v as num),
        dailyCapReached: $checkedConvert('dailyCapReached', (v) => v as bool),
        badgesEarned: $checkedConvert(
          'badgesEarned',
          (v) => (v as List<dynamic>).map((e) => e as String).toList(),
        ),
        portfolioItemId: $checkedConvert(
          'portfolioItemId',
          (v) => v as String?,
        ),
        version: $checkedConvert('version', (v) => v as num?),
      );
      return val;
    });

Map<String, dynamic> _$ShipResultDtoToJson(ShipResultDto instance) =>
    <String, dynamic>{
      'shipped': instance.shipped,
      'results': instance.results.map((e) => e.toJson()).toList(),
      'xpAwarded': instance.xpAwarded,
      'dailyCapReached': instance.dailyCapReached,
      'badgesEarned': instance.badgesEarned,
      'portfolioItemId': instance.portfolioItemId,
      'version': instance.version,
    };
