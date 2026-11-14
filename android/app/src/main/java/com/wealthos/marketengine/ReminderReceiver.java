package com.wealthos.marketengine;

import android.app.*;
import android.content.*;
import android.os.Build;
import android.net.Uri;
import org.json.*;
import java.util.Calendar;

public class ReminderReceiver extends BroadcastReceiver {
 static final String PREF="execution_reminders";
 static JSONArray read(Context c){try{return new JSONArray(c.getSharedPreferences(PREF,0).getString("items","[]"));}catch(Exception e){return new JSONArray();}}
 static PendingIntent alarmIntent(Context c,JSONObject item){Intent i=new Intent(c,ReminderReceiver.class).setAction("DUE").setData(Uri.parse("xindeng://reminder/"+Uri.encode(item.optString("id"))));i.putExtra("id",item.optString("id"));return PendingIntent.getBroadcast(c,0,i,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);}
 static void arm(Context c,JSONObject item){long at=item.optLong("at");if(at<=System.currentTimeMillis())return;AlarmManager a=(AlarmManager)c.getSystemService(Context.ALARM_SERVICE);PendingIntent p=alarmIntent(c,item);if(Build.VERSION.SDK_INT<31||a.canScheduleExactAlarms())a.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP,at,p);else a.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP,at,p);}
 static void sync(Context c,String json){try{JSONArray next=new JSONArray(json);if(next.length()>1000)return;AlarmManager a=(AlarmManager)c.getSystemService(Context.ALARM_SERVICE);JSONArray old=read(c);for(int n=0;n<old.length();n++)a.cancel(alarmIntent(c,old.getJSONObject(n)));c.getSharedPreferences(PREF,0).edit().putString("items",next.toString()).apply();if(next.length()==0)((NotificationManager)c.getSystemService(Context.NOTIFICATION_SERVICE)).cancelAll();for(int n=0;n<next.length();n++)arm(c,next.getJSONObject(n));}catch(Exception ignored){}}
 @Override public void onReceive(Context c,Intent intent){
  JSONArray items=read(c);long now=System.currentTimeMillis();
  for(int n=0;n<items.length();n++)try{JSONObject item=items.getJSONObject(n);
   if("DUE".equals(intent.getAction())&&item.optString("id").equals(intent.getStringExtra("id"))){
    NotificationManager manager=(NotificationManager)c.getSystemService(Context.NOTIFICATION_SERVICE);
    if(Build.VERSION.SDK_INT>=26)manager.createNotificationChannel(new NotificationChannel("execution","流程与待办提醒",NotificationManager.IMPORTANCE_HIGH));
    Intent open=new Intent(c,MainActivity.class).putExtra("executionRoute",item.optString("page","dailyflow")).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK|Intent.FLAG_ACTIVITY_SINGLE_TOP);
    PendingIntent tap=PendingIntent.getActivity(c,item.optString("id").hashCode(),open,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
    Notification.Builder b=Build.VERSION.SDK_INT>=26?new Notification.Builder(c,"execution"):new Notification.Builder(c);
    b.setSmallIcon(android.R.drawable.ic_popup_reminder).setContentTitle("新登 · 到时间了").setContentText(item.optString("title")).setContentIntent(tap).setAutoCancel(true).setVisibility(Notification.VISIBILITY_PRIVATE).setPriority(Notification.PRIORITY_HIGH);
    if(Build.VERSION.SDK_INT<33||c.checkSelfPermission("android.permission.POST_NOTIFICATIONS")==android.content.pm.PackageManager.PERMISSION_GRANTED)manager.notify(item.optString("id").hashCode(),b.build());
   }
   if(item.optBoolean("weekly")&&item.optLong("at")<=now){Calendar cal=Calendar.getInstance();cal.setTimeInMillis(item.optLong("at"));while(cal.getTimeInMillis()<=now)cal.add(Calendar.DATE,7);item.put("at",cal.getTimeInMillis());}
   arm(c,item);
  }catch(Exception ignored){}
  c.getSharedPreferences(PREF,0).edit().putString("items",items.toString()).apply();
 }
}
