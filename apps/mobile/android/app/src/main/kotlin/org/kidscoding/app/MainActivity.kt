package org.kidscoding.app

import android.app.NotificationChannel
import android.app.NotificationManager
import android.os.Build
import android.os.Bundle
import io.flutter.embedding.android.FlutterActivity

class MainActivity : FlutterActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        createReminderChannel()
    }

    /**
     * The channel push notifications arrive on (the API sends "reminders"), so people
     * can switch them off in the phone's settings by name. Its name is translated
     * (res/values-ar, res/values-ur).
     */
    private fun createReminderChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val channel = NotificationChannel(
            "reminders",
            getString(R.string.reminders_channel_name),
            NotificationManager.IMPORTANCE_DEFAULT,
        ).apply { description = getString(R.string.reminders_channel_description) }
        getSystemService(NotificationManager::class.java)?.createNotificationChannel(channel)
    }
}
