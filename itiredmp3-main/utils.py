import smtplib
from email.mime.text import MIMEText
import random
import json
import re
import requests
from collections import Counter
from flask import current_app
from yandex_music import Client
import vk_api

def get_yandex_client(token):
    if not token:
        return None
    try:
        client = Client(token)
        client.init()
        return client
    except Exception as e:
        print(f"Yandex client error: {e}")
        return None

def get_vk_api(token):
    if not token:
        return None
    try:
        vk_session = vk_api.VkApi(token=token)
        return vk_session.get_api()
    except Exception as e:
        print(f"VK API error: {e}")
        return None

def send_verification_email(email, username, token):
    try:
        from flask import current_app
        msg = MIMEText(f"""
Привет, {username}!

Для подтверждения email перейди по ссылке:
{current_app.config.get('BASE_URL', 'http://localhost:5001')}/verify/{token}

Если ты не регистрировался - просто игнорируй это письмо.
        """)
        msg['Subject'] = 'Подтверждение email - iTired'
        msg['From'] = current_app.config.get('MAIL_DEFAULT_SENDER', 'noreply@itired.com')
        msg['To'] = email
        
        with smtplib.SMTP(current_app.config['MAIL_SERVER'], current_app.config['MAIL_PORT']) as server:
            server.starttls()
            server.login(current_app.config['MAIL_USERNAME'], current_app.config['MAIL_PASSWORD'])
            server.send_message(msg)
        return True
    except Exception as e:
        print(f"Email error: {e}")
        return False

class Recommender:
    @staticmethod
    def get_recommendations(user_id, services=None):
        recommendations = []
        if not services:
            services = ['yandex', 'vk']
        
        from models import db, User, LikedTrack
        user = db.session.get(User, user_id) if user_id else None
        
        liked_tracks = db.session.query(LikedTrack).filter_by(user_id=user_id).order_by(LikedTrack.liked_at.desc()).limit(20).all() if user_id else []
        liked_service = None
        if liked_tracks:
            first_track = liked_tracks[0].track_id
            if first_track.startswith('yandex_'):
                liked_service = 'yandex'
            elif first_track.startswith('vk_'):
                liked_service = 'vk'
        
        if 'yandex' in services and user and user.yandex_token:
            client = get_yandex_client(user.yandex_token)
            if client:
                try:
                    if liked_service == 'yandex' and liked_tracks:
                        track_ids = [int(t.track_id.replace('yandex_', '')) for t in liked_tracks[:10] if t.track_id.startswith('yandex_')]
                        if track_ids:
                            tracks_data = client.tracks(track_ids)
                            for track in tracks_data:
                                if track:
                                    recommendations.append({
                                        'id': f"yandex_{track.id}",
                                        'title': track.title,
                                        'type': 'track',
                                        'artists': [a.name for a in track.artists] if track.artists else [],
                                        'cover_uri': f"https://{track.cover_uri.replace('%%', '300x300')}" if track.cover_uri else None,
                                        'duration': track.duration_ms,
                                        'service': 'yandex'
                                    })
                    else:
                        chart = client.chart()
                        if chart and chart.chart.tracks:
                            for track in chart.chart.tracks[:10]:
                                t = track.track
                                recommendations.append({
                                    'id': f"yandex_{t.id}",
                                    'title': t.title,
                                    'type': 'track',
                                    'artists': [a.name for a in t.artists] if t.artists else [],
                                    'cover_uri': f"https://{t.cover_uri.replace('%%', '300x300')}" if t.cover_uri else None,
                                    'duration': t.duration_ms,
                                    'service': 'yandex'
                                })
                except Exception as e:
                    print(f"Yandex recommendations error: {e}")
                
                try:
                    mixes = client.playlists_for_day()
                    for mix in mixes[:5]:
                        recommendations.append({
                            'id': f"yandex_{mix.kind}",
                            'title': mix.title,
                            'type': 'playlist',
                            'track_count': mix.track_count,
                            'cover_uri': f"https://{mix.cover.uri.replace('%%', '300x300')}" if mix.cover and mix.cover.uri else None,
                            'service': 'yandex'
                        })
                except: pass
        
        if 'vk' in services and user and user.vk_token:
            vk = get_vk_api(user.vk_token)
            if vk:
                try:
                    if liked_service == 'vk' and liked_tracks:
                        track_ids = [t.track_id.replace('vk_', '') for t in liked_tracks[:10] if t.track_id.startswith('vk_')]
                        if track_ids:
                            for track_id in track_ids:
                                try:
                                    audio = vk.audio.getById(audios=f"-{track_id}")
                                    if audio:
                                        t = audio[0]
                                        recommendations.append({
                                            'id': f"vk_{t['id']}",
                                            'title': t['title'],
                                            'type': 'track',
                                            'artists': [t['artist']],
                                            'cover_uri': t.get('album', {}).get('thumb', {}).get('photo_300'),
                                            'duration': t['duration'] * 1000,
                                            'service': 'vk'
                                        })
                                except: pass
                    else:
                        recs = vk.audio.getRecommendations(count=10)
                        if 'items' in recs:
                            for track in recs['items']:
                                recommendations.append({
                                    'id': f"vk_{track['id']}",
                                    'title': track['title'],
                                    'type': 'track',
                                    'artists': [track['artist']],
                                    'cover_uri': track.get('album', {}).get('thumb', {}).get('photo_300'),
                                    'duration': track['duration'] * 1000,
                                    'service': 'vk'
                                })
                except: pass
        
        if not recommendations and user and user.yandex_token:
            try:
                client = get_yandex_client(user.yandex_token)
                if client:
                    chart = client.chart()
                    if chart and chart.chart.tracks:
                        for track in chart.chart.tracks[:15]:
                            t = track.track
                            recommendations.append({
                                'id': f"yandex_{t.id}",
                                'title': t.title,
                                'type': 'track',
                                'artists': [a.name for a in t.artists] if t.artists else [],
                                'cover_uri': f"https://{t.cover_uri.replace('%%', '300x300')}" if t.cover_uri else None,
                                'duration': t.duration_ms,
                                'service': 'yandex'
                            })
            except Exception as e:
                print(f"Fallback error: {e}")
        
        random.shuffle(recommendations)
        return recommendations[:15]
